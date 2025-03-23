// src/services/narrativeService.ts
// Service for calling narrative endpoints from your Cloudflare Worker.

const WORKER_URL = 'https://jamkillernarrator.fletcher-christians-account3359.workers.dev';

// Test function to verify worker endpoints
export const testWorkerEndpoints = async () => {
    const testUserId = 'test-' + Date.now();
    const testAnswer = 'This is a test answer for the narrative builder.';

    try {
        console.log('Testing update endpoint...');
        const updateResponse = await fetch(`${WORKER_URL}/narrative/update/${testUserId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ answer: testAnswer }),
        });
        
        console.log('Update Response Status:', updateResponse.status);
        const updateData = await updateResponse.json();
        console.log('Update Response Data:', updateData);

        if (!updateResponse.ok) {
            throw new Error(`Update failed: ${updateResponse.statusText}`);
        }

        console.log('\nTesting finalize endpoint...');
        const finalizeResponse = await fetch(`${WORKER_URL}/narrative/finalize/${testUserId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('Finalize Response Status:', finalizeResponse.status);
        const finalizeData = await finalizeResponse.json();
        console.log('Finalize Response Data:', finalizeData);

        if (!finalizeResponse.ok) {
            throw new Error(`Finalize failed: ${finalizeResponse.statusText}`);
        }

        return {
            update: updateData,
            finalize: finalizeData
        };
    } catch (error) {
        console.error('Worker Test Error:', error);
        throw error;
    }
};

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