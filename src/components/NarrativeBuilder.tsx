import React, { useState, useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { generateImage, checkExistingImage, generateImageWithRetry } from "../services/imageService";
import { updateNarrative, finalizeNarrative } from "../services/narrativeService";
import { uploadMetadata } from "../services/metadataService";
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

// Helper function that creates a uniform image prompt based on the final narrative.
const buildImagePrompt = (narrative: string): string => {
    // The Flux model needs shorter prompts, so trim if necessary
    const trimmedNarrative = narrative.length > 800 ? narrative.substring(0, 800) + "..." : narrative;
    
    return `Create a unique, humorous NFT artwork for "Don't Kill The Jam - A Jam Killer Storied Collectors NFT".
    Style: Whimsical, playful digital art with vibrant colors and exaggerated elements.
    Technical specifications:
    - Bright, cheerful color palette
    - Exaggerated, cartoon-like proportions
    - Playful lighting and shadows
    - Dynamic, energetic composition
    - Fun, whimsical textures
    
    Core elements: Musical instruments, performers, stage elements, with a humorous twist.
    Based on narrative: "${trimmedNarrative}"
    
    Make the image unique and specific to the narrative, but maintain a consistent playful style.
    
    Negative prompt: dark, gloomy, dystopian, realistic, serious, professional, corporate, formal, traditional, classical.`;
};

const NarrativeBuilder: React.FC<NarrativeBuilderProps> = ({ onNarrativeFinalized }) => {
    const address = useAddress();
    const [selectedPath, setSelectedPath] = useState<string>("");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [allAnswers, setAllAnswers] = useState<string[]>([]);
    const [finalNarrative, setFinalNarrative] = useState<string>("");
    const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [nftImage, setNftImage] = useState<string>("");
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
    const [currentAnswer, setCurrentAnswer] = useState<string>("");
    const [metadataUri, setMetadataUri] = useState<string>("");
    const [processingStep, setProcessingStep] = useState<string>("narrative"); // narrative, image, metadata, mint
    const [isCheckingExisting, setIsCheckingExisting] = useState<boolean>(false);
    const [hasExistingData, setHasExistingData] = useState<boolean>(false);
    const [notification, setNotification] = useState<Notification | null>(null);

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

    // Function to show notifications
    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        // Auto-hide after 5 seconds
        setTimeout(() => setNotification(null), 5000);
    };

    // Check for existing data when address changes
    useEffect(() => {
        const checkForExistingData = async () => {
            if (!address) return;
            
            setIsCheckingExisting(true);
            try {
                // Check for existing image
                const existingImage = await checkExistingImage(address);
                if (existingImage && existingImage.image) {
                    setHasExistingData(true);
                    setNftImage(existingImage.image);
                    showNotification('info', 'We found an existing NFT image for your wallet. You can continue with it or start over.');
                }
            } catch (error) {
                console.error("Error checking for existing data:", error);
            }
            setIsCheckingExisting(false);
        };
        
        checkForExistingData();
    }, [address]);

    const handlePathSelection = async (path: string) => {
        if (!address) {
            showNotification('error', 'Please connect your wallet.');
            return;
        }
        
        // Clear existing narrative data before setting new path
        await clearNarrativeData();
        
        setSelectedPath(path);
        setCurrentQuestionIndex(0);
        setAllAnswers([]);
        setFinalNarrative("");
        setNftImage("");
        setCurrentAnswer("");
        setMetadataUri("");
        setProcessingStep("narrative");
        setHasExistingData(false);
    };

    const handleAnswerSubmit = async () => {
        if (!address) {
            showNotification('error', 'Please connect your wallet.');
            return;
        }
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
            await updateNarrative(address, answerToSubmit);
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
        setIsFinalizing(true);
        try {
            showNotification('info', 'Finalizing your narrative...');
            const result = await finalizeNarrative(address as string);
            
            // Extract narrative text, handling different response formats
            let narrativeText = "";
            if (result.data && result.data.narrativeText) {
                narrativeText = result.data.narrativeText;
            } else if (result.response) {
                narrativeText = result.response;
            }
            
            if (narrativeText) {
                // Clean up the narrative if it appears to be truncated
                const cleanedNarrative = cleanupTruncatedNarrative(narrativeText);
                console.log("Final narrative length:", cleanedNarrative.length);
                setFinalNarrative(cleanedNarrative);
                setProcessingStep("image");
                showNotification('success', 'Narrative finalized! You can now generate your NFT image.');
            } else {
                showNotification('error', 'No narrative returned. Please try again.');
            }
        } catch (error) {
            console.error("Error finalizing narrative:", error);
            showNotification('error', 'Error finalizing narrative. Please try again.');
        }
        setIsFinalizing(false);
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

    const handleGenerateImage = async (forceNew = false) => {
        if (!address) {
            showNotification('error', 'Please connect your wallet.');
            return;
        }
        if (!finalNarrative) {
            showNotification('error', 'Finalize your narrative before generating an image.');
            return;
        }
        setIsGeneratingImage(true);
        try {
            showNotification('info', 'Generating your NFT image. This may take up to 30 seconds with the Flux model...');
            const prompt = buildImagePrompt(finalNarrative);
            console.log("Prompt length:", prompt.length);
            
            // Try up to 3 times with exponential backoff
            let attempt = 1;
            const maxAttempts = 3;
            let success = false;
            
            while (attempt <= maxAttempts && !success) {
                try {
                    console.log(`Attempt ${attempt} of ${maxAttempts}`);
                    const result = await generateImage(prompt, address, forceNew || attempt > 1);
                    
                    if (result && result.image) {
                        setNftImage(result.image);
                        setProcessingStep("metadata");
                        showNotification('success', 'Image generated successfully! Ready to upload to IPFS.');
                        success = true;
                        break;
                    } else {
                        throw new Error("No valid image in response");
                    }
                } catch (attemptError) {
                    console.error(`Attempt ${attempt} failed:`, attemptError);
                    
                    if (attempt === maxAttempts) {
                        throw attemptError; // Re-throw on final attempt
                    }
                    
                    // Wait before retrying
                    const delay = 1000 * Math.pow(2, attempt);
                    console.log(`Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                }
            }
        } catch (error) {
            console.error("Error generating image:", error);
            showNotification('error', 'Error generating image. The AI model might be overloaded. Please try again in a few minutes.');
            setProcessingStep("image");
        }
        setIsGeneratingImage(false);
    };
    
    const handleUploadMetadata = async (imageData: string) => {
        if (!address || !finalNarrative || !imageData) {
            showNotification('error', 'Missing required data for metadata upload.');
            return;
        }
        
        setProcessingStep("metadata");
        showNotification('info', 'Uploading metadata to IPFS...');
        
        try {
            const metadata = {
                name: "Don't Kill The Jam NFT",
                description: finalNarrative,
                image: imageData, // Use the image data directly as it already has the correct prefix
                attributes: [
                    {
                        trait_type: "Path",
                        value: selectedPath
                    }
                ]
            };
            
            const metadataResult = await uploadMetadata(metadata, address);
            console.log("Metadata uploaded:", metadataResult);
            
            // Extract URI from various possible response formats
            let uri = null;
            
            if (metadataResult) {
                // Direct URI in expected field
                if (metadataResult.uri) {
                    uri = metadataResult.uri;
                } 
                // Alternative field names that might contain the URI
                else if (metadataResult.url) {
                    uri = metadataResult.url;
                } else if (metadataResult.ipfsUri) {
                    uri = metadataResult.ipfsUri;
                } else if (metadataResult.cid || metadataResult.hash) {
                    uri = `ipfs://${metadataResult.cid || metadataResult.hash}`;
                }
                // Check for nested fields
                else if (metadataResult.data && metadataResult.data.uri) {
                    uri = metadataResult.data.uri;
                }
                // Last resort - try to use the entire result if it's a string
                else if (typeof metadataResult === 'string' && metadataResult.includes('ipfs://')) {
                    uri = metadataResult;
                }
            }
            
            if (uri) {
                console.log("Found IPFS URI:", uri);
                setMetadataUri(uri);
                setProcessingStep("mint");
                showNotification('success', 'Metadata uploaded successfully! You can now mint your NFT.');
                
                // Update the metadata URI in the parent component
                onNarrativeFinalized({
                    metadataUri: uri,
                    narrativePath: selectedPath,
                });
            } else {
                console.error("Could not extract URI from response:", metadataResult);
                // Even though we couldn't find the URI, the upload might have worked
                // Let's try to proceed anyway if we have a response
                if (metadataResult && Object.keys(metadataResult).length > 0) {
                    // Make our best guess at a URI if possible
                    const bestGuessUri = metadataResult.originalResponse ? 
                        `ipfs://unknown-format-see-console-for-details` : 
                        `ipfs://unknown`;
                    
                    console.warn("Using best guess URI:", bestGuessUri);
                    setMetadataUri(bestGuessUri);
                    setProcessingStep("mint");
                    showNotification('info', 'Upload appears successful but URI format is unexpected. Proceeding anyway.');
                    
                    onNarrativeFinalized({
                        metadataUri: bestGuessUri,
                        narrativePath: selectedPath,
                    });
                } else {
                    throw new Error("No metadata URI returned and response is empty");
                }
            }
        } catch (error) {
            console.error("Error uploading metadata:", error);
            showNotification('error', 'Error uploading metadata. Please try again.');
            setProcessingStep("metadata");
        }
    };

    const handleResetProcess = async () => {
        if (!address) {
            showNotification('error', 'Please connect your wallet.');
            return;
        }

        if (window.confirm("This will reset your current progress. Continue?")) {
            // Clear existing narrative data before resetting state
            await clearNarrativeData();
            
            setSelectedPath("");
            setCurrentQuestionIndex(0);
            setAllAnswers([]);
            setFinalNarrative("");
            setNftImage("");
            setCurrentAnswer("");
            setMetadataUri("");
            setProcessingStep("narrative");
            setHasExistingData(false);
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

    const renderProcessingStatus = () => {
        if (isCheckingExisting) {
            return <div className="status-message">Checking for existing data...</div>;
        }
        
        if (hasExistingData && processingStep === "narrative") {
            return (
                <div className="existing-data-message">
                    <p>You have an existing NFT image. Would you like to continue with it or start over?</p>
                    <div className="button-group">
                        <button onClick={() => setProcessingStep("image")}>Continue with Existing Image</button>
                        <button onClick={handleResetProcess}>Start Over</button>
                    </div>
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
        <div>
            {renderNotification()}
            {renderProcessingStatus()}
            
            {!selectedPath && !hasExistingData ? (
                <div className="narrative-section">
                    <h3>Start Your Story</h3>
                    <p>Who's trying to kill your jam?</p>
                    <div className="path-selection">
                        <button onClick={() => handlePathSelection("A")} className="path-button">
                            <span className="path-title">The Baby Next Door</span>
                            <span className="path-description">Your neighbor's baby is the ultimate jam killer. Time to get creative!</span>
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
            ) : processingStep === "narrative" && !finalNarrative ? (
                <div className="narrative-section">
                    <h3>You selected Path {selectedPath}</h3>
                    {renderQuestion()}
                    {currentQuestionIndex >= narrativePaths[selectedPath].length && (
                        <div>
                            <button onClick={handleFinalize} disabled={isFinalizing}>
                                {isFinalizing ? "Finalizing..." : "Finalize Narrative"}
                            </button>
                        </div>
                    )}
                    {allAnswers.length > 0 && (
                        <div>
                            <h4>Your Story So Far:</h4>
                            <ul>
                                {allAnswers.map((answer, idx) => (
                                    <li key={idx}>{answer}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="narrative-section">
                    <h3>Your Final Narrative</h3>
                    <p>{finalNarrative}</p>
                    
                    <div className="process-steps">
                        <div className={`process-step ${processingStep === "image" ? "active" : processingStep === "metadata" || processingStep === "mint" ? "completed" : ""}`}>
                            <span className="step-number">1</span>
                            <span className="step-name">Generate Image</span>
                        </div>
                        <div className={`process-step ${processingStep === "metadata" ? "active" : processingStep === "mint" ? "completed" : ""}`}>
                            <span className="step-number">2</span>
                            <span className="step-name">Upload to IPFS</span>
                        </div>
                        <div className={`process-step ${processingStep === "mint" ? "active" : ""}`}>
                            <span className="step-number">3</span>
                            <span className="step-name">Mint NFT</span>
                        </div>
                    </div>
                    
                    {processingStep === "image" && !nftImage ? (
                        <button 
                            onClick={() => handleGenerateImage(false)} 
                            disabled={isGeneratingImage}
                            className="generate-image-button"
                        >
                            {isGeneratingImage ? "Generating Image..." : "Generate NFT Image"}
                        </button>
                    ) : nftImage && (
                        <div className="nft-preview">
                            <h4>Your NFT Image</h4>
                            <img src={nftImage} alt="Generated NFT" />
                            
                            {processingStep === "image" && (
                                <button 
                                    onClick={() => handleGenerateImage(true)} 
                                    disabled={isGeneratingImage}
                                    className="regenerate-image-button"
                                >
                                    {isGeneratingImage ? "Regenerating..." : "Regenerate Image"}
                                </button>
                            )}
                            
                            {processingStep === "metadata" && (
                                <button 
                                    onClick={() => handleUploadMetadata(nftImage)}
                                    className="upload-metadata-button"
                                >
                                    Upload to IPFS
                                </button>
                            )}
                            
                            {processingStep === "mint" && metadataUri && (
                                <div className="mint-container">
                                    <p>Your NFT metadata has been uploaded to IPFS!</p>
                                    <p className="metadata-uri">Metadata URI: {metadataUri}</p>
                                    <MintNFT 
                                        metadataUri={metadataUri} 
                                        narrativePath={selectedPath} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleResetProcess}
                        className="reset-button"
                    >
                        Start Over
                    </button>
                </div>
            )}
        </div>
    );
};

export default NarrativeBuilder;
