import React, { useState } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { generateImage } from "../services/imageService";
import { updateNarrative, finalizeNarrative } from "../services/narrativeService";
import "./global.css"; // Using Global CSS As Requested

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
    options: string[];
};

const narrativePaths: { [key: string]: Question[] } = {
    A: [
        {
            prompt: "What is the name of your band?",
            options: [
                "The Underground Rhythms",
                "Dystopian Beats",
                "Rebel Harmony",
                "Sonic Resistance",
            ],
        },
        {
            prompt: "Which genre defines your band's sound?",
            options: [
                "Rock Revolution",
                "Electronic Uprising",
                "Jazz Rebellion",
                "Hybrid Dystopia",
            ],
        },
        {
            prompt: "Where do you host your secret gigs?",
            options: [
                "Abandoned subway stations",
                "Hidden warehouses",
                "Underground clubs",
                "Rooftop hideouts",
            ],
        },
        {
            prompt: "How do you keep your gigs secret from the suppressors?",
            options: [
                "Encrypted invites",
                "Word of mouth",
                "Anonymous online forums",
                "Secret signals in the music",
            ],
        },
        {
            prompt: "What is your band’s message in this dystopian world?",
            options: [
                "Freedom through sound",
                "Resistance and rebellion",
                "Unity against oppression",
                "The power of artistic expression",
            ],
        },
    ],
    B: [
        {
            prompt: "What is your stage name?",
            options: [
                "SoloCipher",
                "Neon Prophet",
                "Digital Bard",
                "Synth Savior",
            ],
        },
        {
            prompt: "Which music style best defines your solo act?",
            options: [
                "Ambient resistance",
                "Cyberpunk symphony",
                "Techno revolt",
                "Acoustic insurgency",
            ],
        },
        {
            prompt: "How do you incorporate AI in your composition?",
            options: [
                "Collaborative algorithms",
                "Neural network melodies",
                "Data-driven beats",
                "Generative soundscapes",
            ],
        },
        {
            prompt: "Where do you perform your secret sets?",
            options: [
                "Virtual reality concerts",
                "Secret underground venues",
                "Rooftop livestreams",
                "Hidden city squares",
            ],
        },
        {
            prompt: "What message do you convey through your music?",
            options: [
                "Liberation through technology",
                "The fusion of man and machine",
                "Defiance against control",
                "A new era of sound",
            ],
        },
    ],
    C: [
        {
            prompt: "What is your main objective?",
            options: [
                "Expose government corruption",
                "Unmask corporate control",
                "Reveal secret censorship",
                "Inspire a musical uprising",
            ],
        },
        {
            prompt: "Who do you suspect is behind the suppression?",
            options: [
                "A powerful corporate conglomerate",
                "The authoritarian government",
                "A shadowy cabal of elites",
                "Tech giants and data monopolies",
            ],
        },
        {
            prompt: "What is your method of gathering evidence?",
            options: [
                "Hacking secure networks",
                "Undercover investigations",
                "Collaborating with whistleblowers",
                "Infiltrating secret meetings",
            ],
        },
        {
            prompt: "How do you plan to distribute your findings?",
            options: [
                "Encrypted digital releases",
                "Underground press",
                "Viral social media campaigns",
                "Secret live broadcasts",
            ],
        },
        {
            prompt: "What is your final act of defiance?",
            options: [
                "Organize a mass protest concert",
                "Sabotage the oppressors' systems",
                "Publish a revolutionary manifesto",
                "Lead a covert rebellion",
            ],
        },
    ],
};

// Helper function that creates a uniform image prompt based on the final narrative.
const buildImagePrompt = (narrative: string): string => {
    return `Create an NFT image for "Don't Kill The Jam - A Jam Killer Storied Collectors NFT". The image should evoke a dystopian, rebellious musical world with neon highlights and gritty, futuristic details. It must reflect the following narrative: "${narrative}". The artwork should have a consistent, bold aesthetic that ties together the themes of artistic resistance and creative energy.`;
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

    const handlePathSelection = (path: string) => {
        setSelectedPath(path);
        setCurrentQuestionIndex(0);
        setAllAnswers([]);
        setFinalNarrative("");
        setNftImage("");
    };

    const handleOptionSelect = async (option: string) => {
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        setIsSubmitting(true);
        try {
            let answerToSubmit = option;
            if (allAnswers.length === 0 && selectedPath) {
                answerToSubmit = `Path ${selectedPath}: ${option}`;
            }
            await updateNarrative(address, answerToSubmit);
            setAllAnswers((prev) => [...prev, answerToSubmit]);
            setCurrentQuestionIndex((prev) => prev + 1);
        } catch (error) {
            console.error("Error updating narrative:", error);
            alert("Error updating narrative.");
        }
        setIsSubmitting(false);
    };

    const handleFinalize = async () => {
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        setIsFinalizing(true);
        try {
            const result = await finalizeNarrative(address);
            if (result.data && result.data.narrativeText) {
                setFinalNarrative(result.data.narrativeText);
                // Here, assume metadataUri is generated along with final narrative.
                // For now, we'll simulate metadataUri as a placeholder.
                onNarrativeFinalized({
                    metadataUri: "ipfs://example-metadata-cid",
                    narrativePath: selectedPath,
                });
            } else {
                alert("No narrative returned.");
            }
        } catch (error) {
            console.error("Error finalizing narrative:", error);
            alert("Error finalizing narrative.");
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
            if (result.imagePreview) {
                setNftImage(result.imagePreview);
            } else {
                alert("Image generation failed.");
            }
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Error generating image.");
        }
        setIsGeneratingImage(false);
    };

    const renderQuestion = () => {
        if (!selectedPath) return null;
        const questions = narrativePaths[selectedPath];
        if (currentQuestionIndex < questions.length) {
            const currentQuestion = questions[currentQuestionIndex];
            return (
                <div>
                    <h4>{currentQuestion.prompt}</h4>
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleOptionSelect(option)}
                            className="optionButton"
                            style={{ margin: "0.5rem" }}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="narrativeContainer">
            {!selectedPath ? (
                <div>
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
                <div>
                    <h3>You selected Path {selectedPath}</h3>
                    {renderQuestion()}
                    {currentQuestionIndex >= narrativePaths[selectedPath].length && (
                        <div className="marginTop">
                            <button onClick={handleFinalize} disabled={isFinalizing}>
                                {isFinalizing ? "Finalizing..." : "Finalize Narrative"}
                            </button>
                        </div>
                    )}
                    {allAnswers.length > 0 && (
                        <div className="marginTop">
                            <h4>Submitted Answers:</h4>
                            <ul>
                                {allAnswers.map((answer, idx) => (
                                    <li key={idx}>{answer}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="marginTop">
                    <h3>Final Narrative</h3>
                    <p>{finalNarrative}</p>
                    <div className="marginTop">
                        <button onClick={handleGenerateImage} disabled={isGeneratingImage}>
                            {isGeneratingImage ? "Jam's on the Way..." : "Where's My Jam?"}
                        </button>
                    </div>
                    {nftImage && (
                        <div className="marginTop">
                            <h4>Image Preview</h4>
                            <img
                                src={`data:image/png;base64,${nftImage}`}
                                className="previewImage"
                                alt="NFT Preview"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NarrativeBuilder;