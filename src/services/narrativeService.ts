// src/services/narrativeService.ts
// Service for calling narrative endpoints from your Cloudflare Worker.

const WORKER_URL = 'https://narrativesjamkiller.jam-killer-productions-llc.workers.dev';

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

export const updateNarrative = async (userId: string, answer: string) => {
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
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error updating narrative: ${response.statusText}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('Error in updateNarrative:', error);
        throw error;
    }
};

export const finalizeNarrative = async (userId: string) => {
    try {
        const response = await fetch(`${WORKER_URL}/narrative/finalize/${userId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error finalizing narrative: ${response.statusText}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('Error in finalizeNarrative:', error);
        throw error;
    }
};