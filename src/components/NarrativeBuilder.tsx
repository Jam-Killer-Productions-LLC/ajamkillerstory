import React, { useState, useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { generateImage, checkExistingImage } from "../services/imageService";
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
            prompt: "What is the name of your band?",
            placeholder: "Enter your band's name...",
        },
        {
            prompt: "Which genre defines your band's sound?",
            placeholder: "Describe your band's unique sound...",
        },
        {
            prompt: "Where do you host your secret gigs?",
            placeholder: "Describe your secret performance venue...",
        },
        {
            prompt: "How do you keep your gigs secret from the suppressors?",
            placeholder: "Describe your security measures...",
        },
        {
            prompt: "What is your band's message in this dystopian world?",
            placeholder: "Share your band's mission and message...",
        },
    ],
    B: [
        {
            prompt: "What is your stage name?",
            placeholder: "Enter your stage name...",
        },
        {
            prompt: "Which music style best defines your solo act?",
            placeholder: "Describe your unique musical style...",
        },
        {
            prompt: "How do you incorporate AI in your composition?",
            placeholder: "Explain your AI music creation process...",
        },
        {
            prompt: "Where do you perform your secret sets?",
            placeholder: "Describe your performance space...",
        },
        {
            prompt: "What message do you convey through your music?",
            placeholder: "Share your musical message...",
        },
    ],
    C: [
        {
            prompt: "What is your main objective?",
            placeholder: "Describe your mission...",
        },
        {
            prompt: "Who do you suspect is behind the suppression?",
            placeholder: "Share your suspicions...",
        },
        {
            prompt: "What is your method of gathering evidence?",
            placeholder: "Explain your investigation methods...",
        },
        {
            prompt: "How do you plan to distribute your findings?",
            placeholder: "Describe your distribution strategy...",
        },
        {
            prompt: "What is your final act of defiance?",
            placeholder: "Describe your ultimate plan...",
        },
    ],
};

// Helper function that creates a uniform image prompt based on the final narrative.
const buildImagePrompt = (narrative: string): string => {
    return `Create a high-quality, professional NFT artwork for "Don't Kill The Jam - A Jam Killer Storied Collectors NFT".
    Style: Ultra-detailed digital art, 8K resolution, professional lighting, cinematic composition.
    Technical specifications:
    - Sharp, clear details with high contrast
    - Rich, vibrant colors with professional color grading
    - Dramatic lighting with perfect exposure
    - Professional composition following rule of thirds
    - Photorealistic textures and materials
    
    Core elements: Musical instruments, performers, stage elements, dynamic lighting effects.
    Based on narrative: "${narrative}"
    
    Negative prompt: blurry, low resolution, pixelated, watermarks, text overlays, distorted proportions, amateur composition, noise, grain, out of focus, poorly lit, oversaturated, washed out.
    
    Additional parameters:
    - Steps: 75
    - CFG Scale: 8.5
    - Size: 1024x1024
    - Sampler: DPM++ 2M Karras
    - Denoising strength: 0.7`;
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
            if (result.data && result.data.narrativeText) {
                setFinalNarrative(result.data.narrativeText);
                setProcessingStep("image");
                showNotification('success', 'Narrative finalized! You can now generate your NFT image.');
            } else {
                showNotification('error', 'No narrative returned.');
            }
        } catch (error) {
            console.error("Error finalizing narrative:", error);
            showNotification('error', 'Error finalizing narrative. Please try again.');
        }
        setIsFinalizing(false);
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
            showNotification('info', 'Generating your NFT image. This may take a moment...');
            const prompt = buildImagePrompt(finalNarrative);
            const result = await generateImage(prompt, address, forceNew);
            if (result.image) {
                setNftImage(result.image);
                setProcessingStep("metadata");
                showNotification('success', 'Image generated successfully! Ready to upload to IPFS.');
            }
        } catch (error) {
            console.error("Error in process:", error);
            showNotification('error', 'Error generating image. Please try again.');
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
            
            if (metadataResult.uri) {
                setMetadataUri(metadataResult.uri);
                setProcessingStep("mint");
                showNotification('success', 'Metadata uploaded successfully! You can now mint your NFT.');
                
                // Update the metadata URI in the parent component
                onNarrativeFinalized({
                    metadataUri: metadataResult.uri,
                    narrativePath: selectedPath,
                });
            } else {
                throw new Error("No metadata URI returned");
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
                    <h3>Choose Your Destiny</h3>
                    <button onClick={() => handlePathSelection("A")}>
                        Path A: Build a band and host live events
                    </button>
                    <button onClick={() => handlePathSelection("B")}>
                        Path B: Develop a solo career using AI-driven composition
                    </button>
                    <button onClick={() => handlePathSelection("C")}>
                        Path C: Uncover and fight a conspiracy that suppresses artistic freedom
                    </button>
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
