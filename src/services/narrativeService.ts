// src/services/narrativeService.ts
// Service for calling narrative endpoints from your Cloudflare Worker.

const WORKER_URL = 'https://narratives.producerprotocol.pro';

export async function updateNarrative(userId: string, answer: string) {
    try {
        const response = await fetch(`${WORKER_URL}/narrative/update/${userId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ answer }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update narrative: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating narrative:', error);
        throw error;
    }
}

export async function finalizeNarrative(userId: string) {
    try {
        const response = await fetch(`${WORKER_URL}/narrative/finalize/${userId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to finalize narrative: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error finalizing narrative:', error);
        throw error;
    }
}