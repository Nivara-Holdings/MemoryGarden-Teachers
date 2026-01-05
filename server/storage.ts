import { type User, type InsertUser, type Memory, type InsertMemory, type Child, type InsertChild } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getMemories(childId: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
  
  getChild(id: string): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private memories: Map<string, Memory>;
  private children: Map<string, Child>;

  constructor() {
    this.users = new Map();
    this.memories = new Map();
    this.children = new Map();
    
    this.seedData();
  }

  private seedData() {
    const defaultChildId = "default-child";
    
    this.children.set(defaultChildId, {
      id: defaultChildId,
      name: "Aiden",
      birthday: "Aug 15, 2014",
      viewMode: "device",
      age: 11,
    });

    const seedMemories: Memory[] = [
      {
        id: "1",
        type: "voiceMemo",
        note: "I just want you to know... what you did tonight at the airport—going back to pay for that sandwich—that wasn't a small thing. That's who you are. And I'm so, so proud to be your mom.",
        date: "Jan 1, 2026",
        hasPhoto: false,
        shared: true,
        from: "Mom",
        duration: "0:47",
        transcript: true,
        source: "",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "2",
        type: "moment",
        note: "You helped your sister without anyone asking. That's the kind of person you are—someone who notices, someone who cares. I see it. I always see it.",
        date: "March 15, 2024",
        hasPhoto: false,
        shared: true,
        from: "Mom",
        duration: "",
        transcript: false,
        source: "",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "3",
        type: "fromOthers",
        note: "You're the nicest person in our class. Thank you for always saving me a seat at lunch.",
        date: "Dec 20, 2025",
        hasPhoto: true,
        shared: true,
        from: "Emma (classmate)",
        duration: "",
        transcript: false,
        source: "Birthday card",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "4",
        type: "voiceMemo",
        note: "Happy 11th birthday, buddy. I know I'm not always there as much as I want to be, but I want you to know—every single day, I think about you. I think about the kind of person you're becoming. And it makes me so proud. I love you more than you'll ever know.",
        date: "Aug 15, 2025",
        hasPhoto: false,
        shared: true,
        from: "Dad",
        duration: "1:12",
        transcript: true,
        source: "",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "5",
        type: "fromOthers",
        note: "Your son has a rare gift—he notices when other kids are struggling and quietly helps them. That kind of empathy can't be taught.",
        date: "Nov 10, 2025",
        hasPhoto: false,
        shared: true,
        from: "Mrs. Patterson",
        duration: "",
        transcript: false,
        source: "Parent-teacher conference",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "6",
        type: "keepsake",
        note: "Your first drawing of our family. You made sure to include our dog Max with his spot. You were 4.",
        date: "June 2019",
        hasPhoto: true,
        shared: true,
        from: "Mom",
        duration: "",
        transcript: false,
        source: "",
        keepsakeType: "First drawing",
        childId: defaultChildId,
      },
      {
        id: "7",
        type: "keepsake",
        note: "Student of the Month for showing kindness and leadership. Your teacher said you helped three new students feel welcome.",
        date: "Oct 2025",
        hasPhoto: true,
        shared: true,
        from: "Mom",
        duration: "",
        transcript: false,
        source: "",
        keepsakeType: "Award",
        childId: defaultChildId,
      },
      {
        id: "8",
        type: "moment",
        note: "I watched you stand up for the new kid at school. You didn't know I heard about it. I did. That's who you are.",
        date: "Dec 15, 2025",
        hasPhoto: false,
        shared: true,
        from: "Mom",
        duration: "",
        transcript: false,
        source: "",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "9",
        type: "fromOthers",
        note: "You're my best friend because you never make fun of anyone and you always share your snacks.",
        date: "Sept 2025",
        hasPhoto: false,
        shared: true,
        from: "Jake (best friend)",
        duration: "",
        transcript: false,
        source: "Friendship day card",
        keepsakeType: "",
        childId: defaultChildId,
      },
      {
        id: "10",
        type: "voiceMemo",
        note: "My sweet grandchild... Your mama tells me about all the wonderful things you do. She says you have the biggest heart. I always knew it, from the day you were born. You're going to do great things. Grandma loves you so much.",
        date: "Dec 25, 2025",
        hasPhoto: false,
        shared: true,
        from: "Grandma",
        duration: "0:38",
        transcript: true,
        source: "",
        keepsakeType: "",
        childId: defaultChildId,
      },
    ];

    seedMemories.forEach((memory) => {
      this.memories.set(memory.id, memory);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMemories(childId: string): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .filter((memory) => memory.childId === childId)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    return this.memories.get(id);
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const id = randomUUID();
    const memory: Memory = {
      ...insertMemory,
      id,
      hasPhoto: insertMemory.hasPhoto ?? false,
      shared: insertMemory.shared ?? true,
      duration: insertMemory.duration ?? "",
      transcript: insertMemory.transcript ?? false,
      source: insertMemory.source ?? "",
      keepsakeType: insertMemory.keepsakeType ?? "",
    };
    this.memories.set(id, memory);
    return memory;
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async getChild(id: string): Promise<Child | undefined> {
    return this.children.get(id);
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    const id = randomUUID();
    const child: Child = {
      ...insertChild,
      id,
      birthday: insertChild.birthday ?? null,
      viewMode: insertChild.viewMode ?? "device",
      age: insertChild.age ?? null,
    };
    this.children.set(id, child);
    return child;
  }
}

export const storage = new MemStorage();
