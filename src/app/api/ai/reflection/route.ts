import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';
import { subDays, parseISO } from 'date-fns';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getTasksClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.tasks({ version: 'v1', auth: oauth2Client });
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tasksClient = getTasksClient((session as any).accessToken);
        const response = await tasksClient.tasks.list({
            tasklist: '@default',
            showCompleted: true,
            showHidden: true,
            maxResults: 100,
        });

        const allTasks = response.data.items || [];
        const sevenDaysAgo = subDays(new Date(), 7);

        // Filter tasks completed in the last 7 days
        const completedTasks = allTasks.filter(task => {
            if (task.status !== 'completed' || !task.completed) return false;
            const completedDate = parseISO(task.completed);
            return completedDate >= sevenDaysAgo;
        });

        if (completedTasks.length === 0) {
            return NextResponse.json({
                message: "今週完了したタスクはまだないみたいですね。\n焦らず、自分のペースで少しずつ進めていきましょう。\n温かいコーヒーでも飲んでリラックスしてくださいね☕"
            });
        }

        const taskTitles = completedTasks.map(t => `- ${t.title}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const systemInstruction = `
      あなたはユーザーの1週間のがんばりを褒め称え、リラックスできるような優しい言葉をかける「カフェのマスター」のような存在です。
      以下の完了したタスクのリストを見て、心温まる、優しくて前向きな振り返りメッセージを生成してください。
      長すぎず、3〜4文程度でまとめてください。
    `;

        const result = await model.generateContent(`${systemInstruction}\n今週完了したタスク:\n${taskTitles}`);
        const message = result.response.text();

        return NextResponse.json({ message });

    } catch (error) {
        console.error('Error generating reflection:', error);
        return NextResponse.json({ error: 'Failed to generate reflection' }, { status: 500 });
    }
}
