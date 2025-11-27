import { SignJWT, importPKCS8 } from 'jose';
import { Env } from './index';

export class FirestoreClient {
  private projectId: string;
  private clientEmail: string;
  private privateKey: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(env: Env) {
    this.projectId = env.FIREBASE_PROJECT_ID;
    this.clientEmail = env.FIREBASE_CLIENT_EMAIL;
    this.privateKey = env.FIREBASE_PRIVATE_KEY;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const algorithm = 'RS256';
    const pkcs8 = this.privateKey.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(pkcs8, algorithm);

    const jwt = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/datastore',
    })
      .setProtectedHeader({ alg: algorithm })
      .setIssuer(this.clientEmail)
      .setSubject(this.clientEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer of 1 minute

    return this.accessToken!;
  }

  // Helper to format Firestore document to JSON
  private formatDocument(doc: any) {
    if (!doc) return null;
    const fields = doc.fields || {};
    const formatted: any = { id: doc.name.split('/').pop() };
    for (const key in fields) {
      const value = fields[key];
      if (value.stringValue !== undefined) formatted[key] = value.stringValue;
      else if (value.integerValue !== undefined) formatted[key] = parseInt(value.integerValue);
      else if (value.booleanValue !== undefined) formatted[key] = value.booleanValue;
      else if (value.timestampValue !== undefined) formatted[key] = value.timestampValue;
      else if (value.doubleValue !== undefined) formatted[key] = parseFloat(value.doubleValue);
      else if (value.arrayValue !== undefined) {
        formatted[key] = (value.arrayValue.values || []).map((v: any) => {
             if (v.stringValue !== undefined) return v.stringValue;
             return v;
        });
      }
      // Add other types as needed
    }
    return formatted;
  }

  async getCollection(collection: string) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/${collection}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch collection ${collection}: ${response.statusText}`);
    }
    const data: any = await response.json();
    return (data.documents || []).map(this.formatDocument);
  }

  async createDocument(collection: string, data: any) {
    // Convert JSON to Firestore format
    const fields: any = {};
    for (const key in data) {
      const value = data[key];
      if (typeof value === 'string') fields[key] = { stringValue: value };
      else if (typeof value === 'number') fields[key] = { integerValue: value };
      else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create document in ${collection}: ${response.statusText}`);
    }
    const doc = await response.json();
    return this.formatDocument(doc);
  }

  async setDocument(collection: string, id: string, data: any) {
    // Convert JSON to Firestore format
    const fields: any = {};
    for (const key in data) {
      const value = data[key];
      if (typeof value === 'string') fields[key] = { stringValue: value };
      else if (typeof value === 'number') fields[key] = { integerValue: value };
      else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    }

    const token = await this.getAccessToken();
    // Use PATCH to set document with specific ID
    const response = await fetch(`${this.baseUrl}/${collection}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set document ${collection}/${id}: ${response.statusText}`);
    }
    const doc = await response.json();
    return this.formatDocument(doc);
  }

  async query(collection: string, field: string, operator: string, value: any) {
    // Basic structured query implementation
    const query = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: operator,
            value: typeof value === 'string' ? { stringValue: value } : { integerValue: value }
          }
        }
      }
    };

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}:runQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Failed to query ${collection}: ${response.statusText}`);
    }
    const data: any = await response.json();
    // runQuery returns a list of objects with 'document' or 'readTime'
    return data
      .filter((item: any) => item.document)
      .map((item: any) => this.formatDocument(item.document));
  }

  async getDocument(collection: string, id: string) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/${collection}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch document ${collection}/${id}: ${response.statusText}`);
    }
    const doc = await response.json();
    return this.formatDocument(doc);
  }

  async updateDocument(collection: string, id: string, data: any) {
      // Convert JSON to Firestore format
      const fields: any = {};
      for (const key in data) {
        const value = data[key];
        if (typeof value === 'string') fields[key] = { stringValue: value };
        else if (typeof value === 'number') fields[key] = { integerValue: value };
        else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
      }
  
      const token = await this.getAccessToken();
      // Use PATCH to update specific fields
      const response = await fetch(`${this.baseUrl}/${collection}/${id}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: `${this.baseUrl}/${collection}/${id}`, fields }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to update document ${collection}/${id}: ${response.statusText}`);
      }
      const doc = await response.json();
      return this.formatDocument(doc);
    }
}
