export type Category =
  | "Books"
  | "Gadgets"
  | "Notes"
  | "Electronics"
  | "Cycles"
  | "Hostel Essentials"
  | "Lab Equipment"
  | "Furniture";

export type Product = {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  category: Category;
  condition: "New" | "Like New" | "Good" | "Fair";
  image: string;
  images?: string[];
  seller: { name: string; college: string; verified: boolean; rating: number; avatar: string };
  description: string;
  shortDescription?: string;
  usedFor?: string;
  itemAge?: string;
  negotiable?: boolean;
  pickupLocation?: string;
  department?: string;
  specs?: string[];
  tags?: string[];
  availability?: "Available" | "Reserved" | "Sold";
  forRent?: boolean;
  rentPerDay?: number;
  postedAgo: string;
  /** Present on Firestore-backed listings — opens peer profile & DM */
  sellerId?: string;
};

const img = (q: string, seed: number) =>
  `https://images.unsplash.com/photo-${q}?auto=format&fit=crop&w=900&q=70&sig=${seed}`;

export const products: Product[] = [
  {
    id: "p1",
    title: "Engineering Mathematics — B.S. Grewal (44th Ed.)",
    price: 320,
    originalPrice: 720,
    category: "Books",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Rhea Kulkarni",
      college: "MANIT Bhopal",
      verified: true,
      rating: 4.9,
      avatar: "https://i.pravatar.cc/120?img=12",
    },
    description: "Clean copy with no pen marks and only a few highlighter lines in chapter 3.",
    shortDescription: "First-year staple in excellent reading condition.",
    usedFor: "8 months",
    itemAge: "Bought last year",
    negotiable: true,
    pickupLocation: "Pickup near Central Library",
    department: "Mechanical Engineering",
    specs: ["Edition: 44th", "Binding: Paperback", "Language: English"],
    tags: ["Semester 1", "Maths", "Core"],
    availability: "Available",
    postedAgo: "2 days ago",
  },
  {
    id: "p2",
    title: "Apple MacBook Air M1 — 8GB / 256GB",
    price: 54999,
    originalPrice: 89900,
    category: "Electronics",
    condition: "Like New",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Yash Tiwari",
      college: "LNCT Bhopal",
      verified: true,
      rating: 4.8,
      avatar: "https://i.pravatar.cc/120?img=47",
    },
    description:
      "Single-owner device with strong battery health, original charger, and purchase box.",
    shortDescription: "M1 performance laptop with verified battery condition.",
    usedFor: "14 months",
    itemAge: "2024 model",
    negotiable: false,
    pickupLocation: "Pickup near Hostel Block B",
    department: "CSE",
    specs: ["Chip: Apple M1", "RAM: 8GB", "Storage: 256GB SSD", "Battery cycles: < 90"],
    tags: ["Laptop", "Study", "Coding"],
    availability: "Available",
    postedAgo: "5 hours ago",
  },
  {
    id: "p3",
    title: "Casio FX-991ES Plus Scientific Calculator",
    price: 650,
    originalPrice: 1100,
    category: "Gadgets",
    condition: "Like New",
    image:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Mihir Jain",
      college: "RGPV University",
      verified: true,
      rating: 5.0,
      avatar: "https://i.pravatar.cc/120?img=33",
    },
    description:
      "Used for one semester and fully tested before listing. Protective cover included.",
    shortDescription: "Exam-ready calculator in near-new condition.",
    usedFor: "1 semester",
    itemAge: "Bought in 2025",
    negotiable: true,
    pickupLocation: "Pickup near Academic Block A",
    department: "EEE",
    specs: ["Model: FX-991ES Plus", "Cover: Included", "Keys: Like new"],
    tags: ["Exam", "Calculator", "Engineering"],
    availability: "Available",
    postedAgo: "1 day ago",
  },
  {
    id: "p4",
    title: "Hercules Roadeo Hybrid Cycle — 21 Speed",
    price: 4200,
    originalPrice: 9500,
    category: "Cycles",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Devansh Kapoor",
      college: "SIRT Bhopal",
      verified: true,
      rating: 4.6,
      avatar: "https://i.pravatar.cc/120?img=14",
    },
    description:
      "Recently serviced with new brake pads and fresh tyres, ideal for daily campus rides.",
    forRent: true,
    rentPerDay: 80,
    shortDescription: "Smooth 21-speed cycle for commute or short rentals.",
    usedFor: "2 years",
    itemAge: "Purchased in 2024",
    negotiable: true,
    pickupLocation: "Pickup near Main Gate",
    department: "Civil Engineering",
    specs: ["Gears: 21 speed", "Servicing: done", "Tyres: new"],
    tags: ["Commute", "Cycle", "Hybrid"],
    availability: "Available",
    postedAgo: "3 days ago",
  },
  {
    id: "p5",
    title: "Hostel Study Lamp — Rechargeable LED",
    price: 380,
    category: "Hostel Essentials",
    condition: "New",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Sana Thomas",
      college: "Technocrats Institute",
      verified: true,
      rating: 4.7,
      avatar: "https://i.pravatar.cc/120?img=20",
    },
    description: "Brand new sealed unit with three brightness levels and rechargeable battery.",
    shortDescription: "Unused LED lamp designed for night study sessions.",
    usedFor: "Unused",
    itemAge: "Bought this week",
    negotiable: false,
    pickupLocation: "Pickup near Hostel Block D",
    department: "ECE",
    specs: ["Brightness: 3 levels", "Battery: rechargeable", "Color temp: neutral white"],
    tags: ["Hostel", "Study", "LED"],
    availability: "Available",
    postedAgo: "6 hours ago",
  },
  {
    id: "p6",
    title: "Data Structures + Algorithms Notes (Sem 3)",
    price: 120,
    category: "Notes",
    condition: "Like New",
    image:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Ananya Singh",
      college: "Bhopal School of Engineering",
      verified: true,
      rating: 4.9,
      avatar: "https://i.pravatar.cc/120?img=45",
    },
    description:
      "Complete semester notes with diagrams, complexity tables, and concise revision pages.",
    shortDescription: "Structured sem-3 notes with PYQ-oriented coverage.",
    usedFor: "1 semester",
    itemAge: "Made in 2025",
    negotiable: true,
    pickupLocation: "Pickup near CS Department",
    department: "Computer Science",
    specs: ["Pages: ~140", "Includes: PYQs", "Format: handwritten"],
    tags: ["DSA", "Sem 3", "Topper notes"],
    availability: "Available",
    postedAgo: "1 week ago",
  },
  {
    id: "p7",
    title: "Sony WH-CH520 Wireless Headphones",
    price: 2800,
    originalPrice: 4499,
    category: "Gadgets",
    condition: "Like New",
    image:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Ishaan Verma",
      college: "Oriental Institute Bhopal",
      verified: true,
      rating: 4.8,
      avatar: "https://i.pravatar.cc/120?img=15",
    },
    description: "Lightly used for four months with long battery backup and clear mic quality.",
    shortDescription: "Wireless headphones for calls, classes, and commute.",
    usedFor: "4 months",
    itemAge: "Bought in 2025",
    negotiable: true,
    pickupLocation: "Pickup near Cafeteria Block C",
    department: "IT",
    specs: ["Battery: 50h", "Bluetooth: 5.x", "Mic: built-in"],
    tags: ["Audio", "Wireless", "Sony"],
    availability: "Reserved",
    postedAgo: "2 days ago",
  },
  {
    id: "p8",
    title: "Foldable Study Table — Wood Finish",
    price: 950,
    category: "Furniture",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Tanvi Patel",
      college: "BUIT Bhopal",
      verified: true,
      rating: 4.6,
      avatar: "https://i.pravatar.cc/120?img=22",
    },
    description:
      "Sturdy foldable unit with stable legs and clean finish, suitable for compact hostel rooms.",
    shortDescription: "Space-saving table with laptop + notebook working area.",
    usedFor: "1 year",
    itemAge: "Purchased in 2024",
    negotiable: true,
    pickupLocation: "Pickup near Girls Hostel",
    department: "Architecture",
    specs: ["Foldable: yes", "Material: engineered wood", "Size: medium"],
    tags: ["Hostel", "Furniture", "Study"],
    availability: "Available",
    postedAgo: "4 days ago",
  },
  {
    id: "p9",
    title: "Digital Multimeter — Lab Grade",
    price: 720,
    category: "Lab Equipment",
    condition: "Like New",
    image:
      "https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Rohan Das",
      college: "JEC Jabalpur",
      verified: true,
      rating: 4.9,
      avatar: "https://i.pravatar.cc/120?img=8",
    },
    description: "Calibrated unit used in one EE lab cycle; probes and battery are included.",
    shortDescription: "Reliable lab multimeter for practical sessions.",
    usedFor: "1 lab",
    itemAge: "Bought this semester",
    negotiable: false,
    pickupLocation: "Pickup near EE Lab",
    department: "Electrical Engineering",
    specs: ["Accuracy: lab grade", "Leads: included", "Battery: new"],
    tags: ["Lab", "Multimeter", "EE"],
    availability: "Available",
    postedAgo: "12 hours ago",
  },
  {
    id: "p10",
    title: "iPad 9th Gen 64GB Wi-Fi + Apple Pencil",
    price: 19500,
    originalPrice: 33900,
    category: "Electronics",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Sneha Rao",
      college: "MANIT Bhopal",
      verified: true,
      rating: 4.7,
      avatar: "https://i.pravatar.cc/120?img=49",
    },
    description:
      "Great for digital notes and PDF markup. Includes Apple Pencil and protective case.",
    forRent: true,
    rentPerDay: 250,
    shortDescription: "iPad bundle ready for classes and exam prep.",
    usedFor: "10 months",
    itemAge: "Bought in 2024",
    negotiable: true,
    pickupLocation: "Pickup near Admin Block",
    department: "Chemical Engineering",
    specs: ["Storage: 64GB", "Accessories: Pencil + case", "Condition: minor scratches"],
    tags: ["iPad", "Notes", "Apple Pencil"],
    availability: "Available",
    postedAgo: "1 day ago",
  },
  {
    id: "p11",
    title: "Resnick Halliday — Physics Vol. 1 & 2",
    price: 540,
    originalPrice: 1300,
    category: "Books",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Aditya Joshi",
      college: "RGPV University",
      verified: true,
      rating: 4.8,
      avatar: "https://i.pravatar.cc/120?img=11",
    },
    description:
      "Complete two-volume set with strong binding and clean pages for first-year physics prep.",
    shortDescription: "Classic physics set in good academic condition.",
    usedFor: "1 year",
    itemAge: "Bought in 2024",
    negotiable: true,
    pickupLocation: "Pickup near Physics Department",
    department: "Engineering Physics",
    specs: ["Volumes: 2", "Binding: paperback", "Notes: minimal"],
    tags: ["Physics", "First year", "Core"],
    availability: "Available",
    postedAgo: "3 days ago",
  },
  {
    id: "p12",
    title: "Mini Refrigerator — 50L (Hostel Friendly)",
    price: 3800,
    originalPrice: 6800,
    category: "Hostel Essentials",
    condition: "Good",
    image:
      "https://images.unsplash.com/photo-1536353284924-9220c464e262?auto=format&fit=crop&w=900&q=70",
    seller: {
      name: "Kabir Shah",
      college: "LNCT Bhopal",
      verified: true,
      rating: 4.6,
      avatar: "https://i.pravatar.cc/120?img=7",
    },
    description:
      "Low-noise 50L mini fridge with efficient cooling for drinks, fruit, and essentials.",
    shortDescription: "Energy-efficient mini refrigerator for hostel use.",
    usedFor: "6 months",
    itemAge: "Bought in 2025",
    negotiable: false,
    pickupLocation: "Pickup near Hostel Block A",
    department: "MBA",
    specs: ["Capacity: 50L", "Power: low", "Noise: quiet"],
    tags: ["Hostel", "Appliance", "Mini fridge"],
    availability: "Available",
    postedAgo: "5 days ago",
  },
];

export const categories: { name: Category; count: number }[] = [
  { name: "Books", count: 468 },
  { name: "Gadgets", count: 256 },
  { name: "Notes", count: 532 },
  { name: "Electronics", count: 174 },
  { name: "Cycles", count: 89 },
  { name: "Hostel Essentials", count: 218 },
  { name: "Lab Equipment", count: 94 },
  { name: "Furniture", count: 126 },
];

export const testimonials = [
  {
    name: "Pranav S.",
    college: "MANIT Bhopal",
    quote:
      "I uploaded three first-year books during lunch and they were sold before evening. Verified profiles made the whole process feel safe.",
    avatar: "https://i.pravatar.cc/120?img=5",
  },
  {
    name: "Nikita J.",
    college: "LNCT Bhopal",
    quote:
      "I found a semester cycle rental in 15 minutes and coordinated pickup inside chat. No random bargaining, no confusion.",
    avatar: "https://i.pravatar.cc/120?img=32",
  },
  {
    name: "Aman G.",
    college: "RGPV University",
    quote:
      "The AI assistant helped me price my calculator and draft buyer replies. My listing moved in under a day.",
    avatar: "https://i.pravatar.cc/120?img=17",
  },
];

export const conversations = [
  {
    id: "ai-chat",
    name: "Campus Assistant",
    lastMsg: "I can help with pricing, negotiation drafts, and safe meetup messages.",
    time: "now",
    online: true,
    unread: 0,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bot",
    product: "AI Assistant",
    isBot: true,
  },
  {
    id: "c1",
    name: "Rhea Kulkarni",
    lastMsg: "Confirmed. Central Library entrance works for 5:30 PM.",
    time: "2m",
    online: true,
    unread: 1,
    avatar: "https://i.pravatar.cc/120?img=12",
    product: "B.S. Grewal Maths",
  },
  {
    id: "c2",
    name: "Yash Tiwari",
    lastMsg: "Can you share battery health screenshot once?",
    time: "18m",
    online: true,
    unread: 0,
    avatar: "https://i.pravatar.cc/120?img=47",
    product: "MacBook Air M1",
  },
  {
    id: "c3",
    name: "Mihir Jain",
    lastMsg: "I can pick up after EEE lab tomorrow.",
    time: "3h",
    online: false,
    unread: 0,
    avatar: "https://i.pravatar.cc/120?img=33",
    product: "Casio FX-991ES",
  },
  {
    id: "c4",
    name: "Sana Thomas",
    lastMsg: "Review submitted, thanks for quick handover!",
    time: "1d",
    online: false,
    unread: 0,
    avatar: "https://i.pravatar.cc/120?img=20",
    product: "Study Lamp",
  },
];

export const sampleMessages = [
  { from: "them", text: "Hey! Is the book still available?", time: "10:32" },
  { from: "me", text: "Yes it is — only one copy left though.", time: "10:33" },
  { from: "them", text: "Great! Can we meet today?", time: "10:34" },
  { from: "me", text: "Sure, library entrance at 5 PM works?", time: "10:35" },
  { from: "them", text: "Perfect. See you there 👍", time: "10:36" },
];

export type ItemRequest = {
  id: string;
  itemName: string;
  category: Category;
  budgetMin: number;
  budgetMax: number;
  condition: string;
  description: string;
  urgency: "Low" | "Medium" | "High" | "Urgent";
  campus: string;
  department: string;
  postedAgo: string;
  student: { name: string; avatar: string; verified: boolean };
};

export const itemRequests: ItemRequest[] = [
  {
    id: "r1",
    itemName: "Engineering Drawing Kit (Complete Drafter Set)",
    category: "Lab Equipment",
    budgetMin: 350,
    budgetMax: 800,
    condition: "Good or better",
    description:
      "Need a complete drafter set with T-square, set squares, compass and mini drafter for mechanical graphics lab next week.",
    urgency: "High",
    campus: "LNCT Bhopal",
    department: "Mechanical",
    postedAgo: "14 min ago",
    student: { name: "Rahul Verma", avatar: "https://i.pravatar.cc/120?img=52", verified: true },
  },
  {
    id: "r2",
    itemName: "Hostel Room Cooler or High Airflow Fan",
    category: "Hostel Essentials",
    budgetMin: 1800,
    budgetMax: 4200,
    condition: "Any working condition",
    description:
      "Looking for a portable cooler or premium table fan for summer. Low-noise preferred for shared hostel room.",
    urgency: "Urgent",
    campus: "Technocrats Institute",
    department: "CSE",
    postedAgo: "42 min ago",
    student: { name: "Priya Nair", avatar: "https://i.pravatar.cc/120?img=44", verified: true },
  },
  {
    id: "r3",
    itemName: "24-inch Monitor (Dell / LG / HP)",
    category: "Electronics",
    budgetMin: 4500,
    budgetMax: 8500,
    condition: "Like New",
    description:
      "Need a coding monitor with HDMI input for project work. 1080p or better and no dead pixels.",
    urgency: "Medium",
    campus: "MANIT Bhopal",
    department: "CSE",
    postedAgo: "2 hours ago",
    student: { name: "Arjun Khanna", avatar: "https://i.pravatar.cc/120?img=18", verified: true },
  },
  {
    id: "r4",
    itemName: "DSA + OS Notes (Sem 4)",
    category: "Notes",
    budgetMin: 120,
    budgetMax: 320,
    condition: "Any",
    description:
      "Need complete revision notes for Data Structures and OS with diagrams and previous year questions.",
    urgency: "High",
    campus: "SIRT Bhopal",
    department: "CSE",
    postedAgo: "31 min ago",
    student: { name: "Kavya Joshi", avatar: "https://i.pravatar.cc/120?img=41", verified: false },
  },
  {
    id: "r5",
    itemName: "Casio FX-991EX / FX-991ES Plus",
    category: "Gadgets",
    budgetMin: 500,
    budgetMax: 950,
    condition: "Good",
    description:
      "Need a reliable scientific calculator before internals this week. Original Casio preferred.",
    urgency: "Urgent",
    campus: "RGPV Bhopal",
    department: "ECE",
    postedAgo: "26 min ago",
    student: { name: "Siddharth Rao", avatar: "https://i.pravatar.cc/120?img=60", verified: true },
  },
  {
    id: "r6",
    itemName: "Foldable Study Table (Hostel Size)",
    category: "Furniture",
    budgetMin: 700,
    budgetMax: 1600,
    condition: "Good or better",
    description:
      "Need a compact foldable table for hostel room setup. Prefer sturdy legs and space for laptop + notebook.",
    urgency: "Low",
    campus: "Oriental Group of Institutes",
    department: "MBA",
    postedAgo: "4 hours ago",
    student: { name: "Nisha Agarwal", avatar: "https://i.pravatar.cc/120?img=25", verified: true },
  },
];
