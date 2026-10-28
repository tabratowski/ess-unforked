export type User = { id: number; login: string; email: string };

export type Group = {
  id: number;
  name: string;
  capacity: number;
  memberCount: number;
  status: "open" | "drawn";
  drawnAt: string | null;
  isMember: boolean;
};

export type Assignment = { groupName: string; receiverLogin: string };

export type FormState = { error?: string; message?: string };
