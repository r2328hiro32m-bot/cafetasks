import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateNewDueDate, mapGoogleTaskToKanbanTask } from '@/lib/task-utils';
import { google } from 'googleapis';

export const maxDuration = 60; // Vercel hobby plan timeout limit extension for AI tasks

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getTasksClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.tasks({ version: 'v1', auth: oauth2Client });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { prompt } = await request.json();
        if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `
      あなたはユーザーの「ざっくりしたタスク（例：週末の旅行の準備をする）」を、
      具体的で実行可能な小さなステップ（3〜5個程度）に分解するアシスタントです。
      各ステップには、そのステップが実行されるべき論理的な相対的な期日（'today', 'tomorrow', 'week', 'later'）を割り当ててください。
      結果は必ず以下の形式のJSON配列のみ出力してください。バッククオートやmarkdownは不要です。
      [
        { "title": "ステップ名", "suggestedColumn": "today" }, ...
      ]
    `;

        const result = await model.generateContent(`${systemInstruction}\n入力: ${prompt}`);
        const responseText = result.response.text();

        // Parse JSON
        let steps: { title: string, suggestedColumn: string }[] = [];
        try {
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            steps = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse Gemini output:", responseText);
            return NextResponse.json({ error: 'AI parsing failed' }, { status: 500 });
        }

        const tasksClient = getTasksClient((session as any).accessToken);
        const createdTasks = [];

        // Create these tasks in Google Tasks API
        for (const step of steps) {
            const validColumns = ['today', 'tomorrow', 'week', 'later'];
            const column = validColumns.includes(step.suggestedColumn) ? step.suggestedColumn : 'later';

            const due = calculateNewDueDate(column as any);

            const taskPayload: any = {
                title: step.title,
                notes: `AIによる自動分解 (元のタスク: ${prompt})`
            };
            if (due) taskPayload.due = due;

            const res = await tasksClient.tasks.insert({
                tasklist: '@default',
                requestBody: taskPayload,
            });

            createdTasks.push(mapGoogleTaskToKanbanTask(res.data));
        }

        return NextResponse.json({ message: 'Success', tasks: createdTasks });

    } catch (error: any) {
        console.error('Error generating AI task:', error);
        return NextResponse.json({ error: error?.message || 'AI Task Breakdown Failed' }, { status: 500 });
    }
}
