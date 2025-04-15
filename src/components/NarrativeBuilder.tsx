import React, { useState, useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { updateNarrative, finalizeNarrative } from "../services/narrativeService";
import MintNFT from "./MintNFT";

// Define the data structure for the finalized narrative
export interface NarrativeFinalizedData {
    metadataUri: string;
    narrativePath: string;
}

// Define the prop types for NarrativeBuilder
interface NarrativeBuilderProps {
    onNarrativeFinalized: (data: NarrativeFinalizedData) => void;
}

type Question = {
    prompt: string;
    placeholder: string;
};

// Define notification type
interface Notification {
    type: 'success' | 'error' | 'info';
    message: string;
}

const narrativePaths: { [key: string]: Question[] } = {
    A: [
        {
            prompt: "What's the most ridiculous way you'd save a dying jam session?",
            placeholder: "Like using a rubber chicken as a guitar or turning a blender into a drum machine...",
        },
        {
            prompt: "What's the strangest place you'd rescue a jam from?",
            placeholder: "Maybe from a library's quiet section or a meditation retreat...",
        },
        {
            prompt: "What unexpected sound would you use to revive the jam?",
            placeholder: "Like making a vacuum cleaner sing or turning a coffee grinder into a bass...",
        },
        {
            prompt: "What other unlikely heroes would join your jam rescue team?",
            placeholder: "Perhaps a beatboxing librarian or a DJ-ing construction worker...",
        },
        {
            prompt: "What's the funniest name for your jam rescue squad?",
            placeholder: "Something like 'The Jam Revivalists' or 'The Groove Guardians'...",
        },
    ],
    B: [
        {
            prompt: "What's the most ridiculous way you'd sabotage a jam-killing device?",
            placeholder: "Like reprogramming a noise-canceling machine to play jazz or turning a silence ray into a disco ball...",
        },
        {
            prompt: "What's the strangest weapon you'd use against jam killers?",
            placeholder: "Maybe a trombone that shoots confetti or a keyboard that turns enemies into backup dancers...",
        },
        {
            prompt: "What unexpected sound would defeat the jam killers?",
            placeholder: "Like a kazoo that makes them dance uncontrollably or a triangle that turns them into jazz enthusiasts...",
        },
        {
            prompt: "What other unlikely allies would join your anti-jam-killer team?",
            placeholder: "Perhaps a breakdancing robot or a beatboxing grandma...",
        },
        {
            prompt: "What's the funniest name for your anti-jam-killer organization?",
            placeholder: "Something like 'The Jam Liberation Front' or 'The Groove Rebellion'...",
        },
    ],
    C: [
        {
            prompt: "What's the most ridiculous way you'd expose a jam-killing conspiracy?",
            placeholder: "Like discovering that silence is actually stored in giant underground tanks or that quiet zones are actually secret jam prisons...",
        },
        {
            prompt: "What's the strangest evidence you'd find?",
            placeholder: "Maybe a collection of confiscated kazoos or a secret map of all the world's silent zones...",
        },
        {
            prompt: "What unexpected way would you gather proof?",
            placeholder: "Like using a team of trained parrots to record secret meetings or a network of musical plants...",
        },
        {
            prompt: "What other unlikely investigators would join your team?",
            placeholder: "Perhaps a jazz-loving detective or a rock-and-roll journalist...",
        },
        {
            prompt: "What's the funniest name for your investigation team?",
            placeholder: "Something like 'The Jam Truth Seekers' or 'The Groove Detectives'...",
        },
    ],
};

// Helper function to calculate the Mojo Score
const calculateMojoScore = (path: string): number => {
    // Base score for each path
    switch(path) {
        case "A": return 8000;
        case "B": return 7500;
        case "C": return 8500;
        default: return 5000;
    }
    // In a real implementation, you might want to factor in other elements 
    // like narrative length, question responses, etc.
};

const NarrativeBuilder: React.FC<NarrativeBuilderProps> = ({ onNarrativeFinalized }) => {
    const address = useAddress();
    const [selectedPath, setSelectedPath] = useState<string>("");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [allAnswers, setAllAnswers] = useState<string[]>([]);
    const [finalNarrative, setFinalNarrative] = useState<string>("");
    const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [currentAnswer, setCurrentAnswer] = useState<string>("");
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isFinalized, setIsFinalized] = useState<boolean>(false);
    const [mojoScore, setMojoScore] = useState<number>(0);
    
    // Base NFT token and media URIs - updated with exact URIs from successful mint
    const baseTokenUri = "ipfs://QmfS4CpKMBQgiJKXPoGHdQsgKYSEhDJar2vpn4zVH81fSK/0";
    const baseMediaUri = "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/Mystic%20enchanting%20logo%20depicting%20Cannabis%20is%20Medicine%20in%20gentle%20color%20contrasts%20and%20a%20dreamlike%20atmosphere%2C%20otherworldly%20ethereal%20quality%2C%20geometric%20shapes%2C%20clean%20lines%2C%20balanced%20symmetry%2C%20visual%20clarity.jpeg";

    // Function to show notifications
    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        // Auto-hide after 5 seconds
        setTimeout(() => setNotification(null), 5000);
    };

    const handlePathSelection = async (path: string) => {
        // Allow path selection without requiring address
        setSelectedPath(path);
        setCurrentQuestionIndex(0);
        setAllAnswers([]);
        setFinalNarrative("");
        setCurrentAnswer("");
        setIsFinalized(false);
        
        // If address is available, clear narrative data
        if (address) {
            try {
                await clearNarrativeData();
            } catch (error) {
                console.error("Error clearing narrative data:", error);
            }
        }
    };

    // Add clearNarrativeData function
    const clearNarrativeData = async () => {
        if (!address) return;
        
        try {
            console.log("Attempting to clear narrative data for address:", address);
            
            // First try with the special command
            try {
                await updateNarrative(address, "CLEAR_NARRATIVE");
                console.log("Successfully cleared narrative data with CLEAR_NARRATIVE command");
                showNotification('info', 'Previous narrative data cleared.');
                return;
            } catch (cmdError) {
                console.warn("Failed to clear with CLEAR_NARRATIVE command:", cmdError);
                // Continue to fallback methods if the special command fails
            }
            
            // If the special command fails, try with an empty string (may work with some worker implementations)
            try {
                await updateNarrative(address, "");
                console.log("Successfully cleared narrative data with empty string");
                showNotification('info', 'Previous narrative data cleared.');
                return;
            } catch (emptyError) {
                console.warn("Failed to clear with empty string:", emptyError);
                // Continue to fallback methods
            }
            
            // As a last resort, try resetting with a special message that the worker might accept
            try {
                await updateNarrative(address, "__RESET__");
                console.log("Successfully cleared narrative data with __RESET__ command");
                showNotification('info', 'Previous narrative data cleared.');
                return;
            } catch (resetError) {
                console.error("All clearing methods failed:", resetError);
                throw resetError; // Re-throw to be caught by the outer try/catch
            }
        } catch (error) {
            console.error("Error clearing narrative data:", error);
            showNotification('error', 'Error clearing previous data. Try again or continue anyway.');
        }
    };

    const handleAnswerSubmit = async () => {
        if (!currentAnswer.trim()) {
            showNotification('error', 'Please enter an answer.');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            let answerToSubmit = currentAnswer;
            if (allAnswers.length === 0 && selectedPath) {
                answerToSubmit = `Path ${selectedPath}: ${currentAnswer}`;
            }
            
            // Only call the API if we have an address
            if (address) {
                await updateNarrative(address, answerToSubmit);
            }
            
            // Always update local state
            setAllAnswers((prev) => [...prev, answerToSubmit]);
            setCurrentQuestionIndex((prev) => prev + 1);
            setCurrentAnswer("");
            
            // Show success notification
            if (currentQuestionIndex + 1 >= narrativePaths[selectedPath].length) {
                showNotification('success', 'All questions answered! You can now finalize your narrative.');
            } else {
                showNotification('success', 'Answer submitted successfully!');
            }
        } catch (error) {
            console.error("Error updating narrative:", error);
            showNotification('error', 'Error updating narrative. Please try again.');
        }
        
        setIsSubmitting(false);
    };

    const handleFinalize = async () => {
        if (currentQuestionIndex < narrativePaths[selectedPath].length) {
            showNotification('error', 'Please answer all questions before finalizing.');
            return;
        }
        
        setIsFinalizing(true);
        
        try {
            showNotification('info', 'Finalizing your narrative...');
            
            let narrativeText = "";
            
            // Only call the API if we have an address
            if (address) {
                const result = await finalizeNarrative(address);
                
                // Extract narrative text, handling different response formats
                if (result.data && result.data.narrativeText) {
                    narrativeText = result.data.narrativeText;
                } else if (result.response) {
                    narrativeText = result.response;
                } else if (typeof result === 'string') {
                    narrativeText = result;
                }
            } else {
                // Generate a simple narrative if no address (for demo purposes)
                narrativeText = `This is a sample narrative for path ${selectedPath}. In a real app, this would be generated by an API based on your answers.`;
            }
            
            if (!narrativeText) {
                throw new Error("No narrative text returned from the server");
            }
            
            // Clean up the narrative if it appears to be truncated
            const cleanedNarrative = cleanupTruncatedNarrative(narrativeText);
            console.log("Final narrative length:", cleanedNarrative.length);
            setFinalNarrative(cleanedNarrative);
            
            // Calculate Mojo score based on the path
            const score = calculateMojoScore(selectedPath);
            setMojoScore(score);
            
            setIsFinalized(true);
            showNotification('success', 'Narrative finalized! Now you can mint your NFT.');
            
            // Use the verified token URI from successful mint
            onNarrativeFinalized({
                metadataUri: baseTokenUri,
                narrativePath: selectedPath,
            });
        } catch (error) {
            console.error("Error finalizing narrative:", error);
            showNotification('error', 'Error finalizing narrative. Please try again.');
        } finally {
            setIsFinalizing(false);
        }
    };

    // Helper function to clean up potentially truncated narratives
    const cleanupTruncatedNarrative = (narrative: string): string => {
        if (!narrative) return "";
        
        // Check if the narrative appears truncated (ends mid-sentence with no punctuation)
        const endsWithPunctuation = /[.!?][\s"']*$/.test(narrative);
        
        if (!endsWithPunctuation) {
            console.log("Narrative appears to be truncated, looking for last complete sentence");
            
            // Find the last complete sentence by looking for sentence-ending punctuation
            const lastPeriodIndex = narrative.lastIndexOf('.');
            const lastExclamationIndex = narrative.lastIndexOf('!');
            const lastQuestionIndex = narrative.lastIndexOf('?');
            
            // Get the max of the three, ensuring we don't return -1
            const lastCompleteSentenceIndex = Math.max(
                lastPeriodIndex, 
                lastExclamationIndex, 
                lastQuestionIndex
            );
            
            // If we have a valid index that's not too close to the beginning
            if (lastCompleteSentenceIndex > 0 && lastCompleteSentenceIndex > narrative.length * 0.5) {
                // Include the punctuation mark by adding 1 to the index
                const completeNarrative = narrative.substring(0, lastCompleteSentenceIndex + 1);
                console.log(`Truncated narrative from ${narrative.length} to ${completeNarrative.length} characters`);
                return completeNarrative;
            }
            
            // If we don't have a good truncation point, add an ellipsis to indicate it's incomplete
            return narrative + "...";
        }
        
        return narrative;
    };

    const handleResetProcess = async () => {
        if (window.confirm("This will reset your current progress. Continue?")) {
            // Clear existing narrative data if address is available
            if (address) {
                await clearNarrativeData();
            }
            
            setSelectedPath("");
            setCurrentQuestionIndex(0);
            setAllAnswers([]);
            setFinalNarrative("");
            setCurrentAnswer("");
            setIsFinalized(false);
            showNotification('info', 'Process reset. You can start over.');
        }
    };

    const renderQuestion = () => {
        if (!selectedPath) return null;
        const questions = narrativePaths[selectedPath];
        if (currentQuestionIndex < questions.length) {
            const currentQuestion = questions[currentQuestionIndex];
            return (
                <div className="narrative-section">
                    <h4>{currentQuestion.prompt}</h4>
                    <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        rows={4}
                    />
                    <button
                        onClick={handleAnswerSubmit}
                        disabled={isSubmitting || !currentAnswer.trim()}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Answer"}
                    </button>
                </div>
            );
        }
        return null;
    };

    // Render notification
    const renderNotification = () => {
        if (!notification) return null;
        
        return (
            <div className={`notification ${notification.type}`}>
                {notification.message}
                <button className="close-notification" onClick={() => setNotification(null)}>×</button>
            </div>
        );
    };

    return (
        <div className="narrative-builder">
            {renderNotification()}
            
            {!selectedPath ? (
                <div className="narrative-section">
                    <h3>Start Your Story</h3>
                    <p>Who's trying to kill your jam?</p>
                    <div className="path-selection">
                        <button onClick={() => handlePathSelection("A")} className="path-button">
                            <span className="path-title">The Noise Police Neighbor</span>
                            <span className="path-description">Your uptight neighbor with a decibel meter and a vendetta against fun. Time to turn up the volume!</span>
                        </button>
                        <button onClick={() => handlePathSelection("B")} className="path-button">
                            <span className="path-title">The Mean Girlfriend</span>
                            <span className="path-description">She says your music is "too loud" and "embarrassing". Show her what real music is!</span>
                        </button>
                        <button onClick={() => handlePathSelection("C")} className="path-button">
                            <span className="path-title">The Jerk Bar Owner</span>
                            <span className="path-description">He cut your set short for "being too experimental". Time for revenge!</span>
                        </button>
                    </div>
                </div>
            ) : currentQuestionIndex < narrativePaths[selectedPath].length ? (
                // Show questions if not all are answered
                <div className="narrative-question-section">
                    {renderQuestion()}
                </div>
            ) : (
                // Show finalize narrative and mint NFT option
                <div className="narrative-section">
                    <h3>Your Final Narrative</h3>
                    <p>{finalNarrative}</p>
                    
                    {!isFinalized ? (
                        <button onClick={handleFinalize} disabled={isFinalizing}>
                            {isFinalizing ? "Finalizing..." : "Finalize Narrative"}
                        </button>
                    ) : (
                        <div>
                            <div className="mojo-score-preview">
                                <p>Your Mojo Score: <span className="mojo-score">{mojoScore}</span></p>
                            </div>
                            <MintNFT 
                                metadataUri={baseTokenUri} 
                                narrativePath={selectedPath} 
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NarrativeBuilder;