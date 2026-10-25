// ----------------------------------------------------------------------------------
//  Name:    types.ts
//  Author:  Mark Casey
//
//  Purpose: Shared client domain types: layouts, credentials, accounts, contacts,
//           links and contact payloads.
//
//  Features:
//   • LayoutKind     → union type
//   • Credentials    → type
//   • Account        → interface
//   • Contact        → interface
//   • ContactLink    → interface
//   • ContactPayload → interface
// ----------------------------------------------------------------------------------
export type LayoutKind = 'force' | 'circle' | 'hex' | 'spiral' | 'groups';

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

export interface ContactPayload {
  accountId?:   string;
  fullName:     string;
  handle?:      string;
  email?:       string;
  phone?:       string;
  avatarUrl?:   string;
  company?:     string;
  title?:       string;
  location?:    string;
  notes?:       string;
  tags?:        string[];
  customLinks?: string[];
}
