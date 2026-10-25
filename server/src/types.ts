// ----------------------------------------------------------------------------------
//  Name:    types.ts
//  Author:  Mark Casey
//
//  Purpose: Shared domain types for the iCulus API: credentials, accounts,
//           contacts, and the links between them.
//
//  Exported API:
//   • Credentials → type
//   • Account     → interface
//   • Contact     → interface
//   • ContactLink → interface
// ----------------------------------------------------------------------------------
export type Credentials = {
  username?: string;
  password?: string;
  apiKey?:   string;
  token?:    string;
  [key: string]: string | undefined;
};

export interface Account {
  id:             string;
  platform:       string;
  label:          string;
  color:          string;
  icon:           string;
  hasCredentials: boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface Contact {
  id:          string;
  accountId:   string;
  fullName:    string;
  handle:      string | null;
  email:       string | null;
  phone:       string | null;
  avatarUrl:   string | null;
  company:     string | null;
  title:       string | null;
  location:    string | null;
  notes:       string | null;
  tags:        string[];
  customLinks: string[];
  createdAt:   string;
  updatedAt:   string;
}

export interface ContactLink {
  id:         string;
  sourceId:   string;
  targetId:   string;
  kind:       'auto' | 'manual';
  confidence: number;
  createdAt:  string;
}
