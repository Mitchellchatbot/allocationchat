export interface ChatShortcut {
  id: number;
  label: string;
  text: string;
}

export const defaultShortcuts: ChatShortcut[] = [
  {
    id: 1,
    label: "Levels of care intro",
    text: "We work with a network of facilities that offer all levels of care. We use a two-step process to provide the best options available. First, we complete a quick pre-screen, then connect you with an admissions coordinator who can walk you through everything.",
  },
  {
    id: 2,
    label: "Insurance check",
    text: "Just so I know we are going in the right direction, is there currently any private health insurance coverage?",
  },
  {
    id: 3,
    label: "Insurance type",
    text: "Is that insurance through the state or an employer?",
  },
  {
    id: 4,
    label: "Collect basics",
    text: "Let's start with the basics. What is your name, DOB & phone number?",
  },
  {
    id: 5,
    label: "Insurance accepted",
    text: "I'm glad you've reached out to us. We accept Cigna, Aetna, Blue Cross-Blue Shield and more. For more information, I can connect you with one of our patient advocates.",
  },
  {
    id: 6,
    label: "Timeline",
    text: "How soon were you looking at coming in for treatment?",
  },
  {
    id: 7,
    label: "Services needed",
    text: "Thank you. Can you tell me a little about the services you're looking for?",
  },
  {
    id: 8,
    label: "Transfer to specialist",
    text: "I'd like to connect you with one of our specialists who can help you further. Let me transfer you now.",
  },
];
