import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

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
            maxResults: 100, // Reasonable max for current usage
        });
        return NextResponse.json(response.data.items || []);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const tasksClient = getTasksClient((session as any).accessToken);

        // Prepare Google Task formatted payload
        const taskPayload: any = {
            title: body.title,
        };
        if (body.due) {
            taskPayload.due = body.due; // RFC 3339 timestamp
        }
        if (body.notes) {
            taskPayload.notes = body.notes;
        }

        const response = await tasksClient.tasks.insert({
            tasklist: '@default',
            requestBody: taskPayload,
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any).accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, title, due, status, notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const tasksClient = getTasksClient((session as any).accessToken);

        const taskPayload: any = {
            id,
        };
        if (title !== undefined) taskPayload.title = title;
        if (due !== undefined) taskPayload.due = due;
        if (status !== undefined) taskPayload.status = status; // 'needsAction' or 'completed'
        if (notes !== undefined) taskPayload.notes = notes;

        const response = await tasksClient.tasks.patch({
            tasklist: '@default',
            task: id,
            requestBody: taskPayload,
        });

        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}
