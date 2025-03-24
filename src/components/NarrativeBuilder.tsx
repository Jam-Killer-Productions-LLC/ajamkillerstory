import React, { useState } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { generateImage } from "../services/imageService";
import { updateNarrative, finalizeNarrative } from "../services/narrativeService";

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
    return `Create an NFT image for "Don't Kill The Jam - A Jam Killer Storied Collectors NFT". The image should evoke a dystopian, rebellious musical world with neon highlights and gritty, futuristic details. It must reflect the following narrative: "${narrative}". The artwork should have a consistent, bold aesthetic that ties together the themes of artistic resistance and creative energy. Negative prompt: avoid bright cheerful colors, cartoonish styles, pastoral scenes, or anything that feels overly optimistic or disconnected from a dystopian vibe.`;
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

    const handlePathSelection = (path: string) => {
        setSelectedPath(path);
        setCurrentQuestionIndex(0);
        setAllAnswers([]);
        setFinalNarrative("");
        setNftImage("");
        setCurrentAnswer("");
    };

    const handleAnswerSubmit = async () => {
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        if (!currentAnswer.trim()) {
            alert("Please enter an answer.");
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
        } catch (error) {
            console.error("Error updating narrative:", error);
            alert("Error updating narrative. Please try again.");
        }
        setIsSubmitting(false);
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        try {
            const result = await finalizeNarrative(address as string);
            if (result.data && result.data.narrativeText) {
                setFinalNarrative(result.data.narrativeText);
                onNarrativeFinalized({
                    metadataUri: "ipfs://example-metadata-cid",
                    narrativePath: selectedPath,
                });
            } else {
                alert("No narrative returned.");
            }
        } catch (error) {
            console.error("Error finalizing narrative:", error);
            alert("Error finalizing narrative. Please try again.");
        }
        setIsFinalizing(false);
    };

    const handleGenerateImage = async () => {
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        if (!finalNarrative) {
            alert("Finalize your narrative before generating an image.");
            return;
        }
        setIsGeneratingImage(true);
        try {
            const prompt = buildImagePrompt(finalNarrative);
            const result = await generateImage(prompt, address);
            if (result.image) {
                setNftImage(result.data.image);
            }
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Error generating image. Please try again.");
        }
        setIsGeneratingImage(false);
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

    return (
        <div>
            {!selectedPath ? (
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
            ) : !finalNarrative ? (
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
                    {!nftImage ? (
                        <button 
                            onClick={handleGenerateImage} 
                            disabled={isGeneratingImage}
                            className="generate-image-button"
                        >
                            {isGeneratingImage ? "Generating Image..." : "Generate NFT Image"}
                        </button>
                    ) : (
                        <div className="nft-preview">
                            <h4>Your NFT Image</h4>
                            <img src={nftImage} alt="Generated NFT" />
                            <button 
                                onClick={() => handleGenerateImage()} 
                                disabled={isGeneratingImage}
                                className="regenerate-image-button"
                            >
                                {isGeneratingImage ? "Regenerating..." : "Regenerate Image"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NarrativeBuilder;