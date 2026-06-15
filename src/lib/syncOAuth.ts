import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { VisitData } from '../types';
import { calculateVisitResults } from './scoring';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
} catch (e) {
  console.warn("Failed to initialize Firebase Sync OAuth", e);
}

export { auth };

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth) throw new Error("Firebase Auth is not initialized. Please configure credentials.");
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro de autenticação:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  if (!auth) return;
  await signOut(auth);
  cachedAccessToken = null;
};

const SPREADSHEET_TITLE = 'SuinoSaude_Backup_Online';

// Helper to interact with Google Sheets/Drive APIs
export const syncHistoryToSheets = async (localHistory: VisitData[]) => {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado no Google.");

  // 1. Find existing spreadsheet
  const dRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!dRes.ok) {
    const errorBody = await dRes.text();
    throw new Error(`Drive API Error: ${errorBody}`);
  }
  const dData = await dRes.json();
  let spreadsheetId = dData.files && dData.files.length > 0 ? dData.files[0].id : null;

  // 2. Create if not found
  if (!spreadsheetId) {
    const cRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: SPREADSHEET_TITLE }
      })
    });
    if (!cRes.ok) {
      const errorBody = await cRes.text();
      throw new Error(`Create Spreadsheet Error: ${errorBody}`);
    }
    const cData = await cRes.json();
    spreadsheetId = cData.spreadsheetId;
  }

  // 3. Get sheet name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!metaRes.ok) {
    const errorBody = await metaRes.text();
    throw new Error(`Sheets API Error (meta): ${errorBody}`);
  }
  const meta = await metaRes.json();
  const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  // 4. Format data for sheets
  const headers = [
    'ID', 'Cliente_Associado', 'Unidade_Produtor', 'Lote', 'Data_Visita', 'Fase_Producao',
    'Racao_Atual', 'Protocolo_Medicamentoso', 'Data_Alojamento', 'Total_Animais', 'Mortalidade_Lote',
    'Temperatura_C', 'Umidade_Relativa', 'CO2_ppm', 'Duracao_Sintomas', 
    'Contagem_Tosse', 'Contagem_Espirro', 'Contagem_Fezes_Pastosas', 'Contagem_Fezes_Liquidas',
    'Observacoes', 'Imagens_Urls'
  ];

  const rows = [headers];
  for (const v of localHistory) {
    rows.push([
      v.id.toString(),
      v.producer || '',
      v.farm || '',
      v.batch || '',
      v.date || '',
      v.phase || '',
      v.feed || '',
      v.meds || '',
      v.housingDate || '',
      (v.totalAnimals || 0).toString(),
      (v.mortality || 0).toString(),
      v.temp || '',
      v.humidity || '',
      v.co2 || '',
      v.duration || '',
      (v.counts?.cough ?? 0).toString(),
      (v.counts?.sneeze ?? 0).toString(),
      (v.counts?.e2 ?? 0).toString(),
      (v.counts?.e3 ?? 0).toString(),
      v.notes || '',
      v.images ? JSON.stringify(v.images) : '[]'
    ]);
  }

  // 5. Clear the sheet first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  // 6. Push the new data
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `${sheetName}!A1`,
      majorDimension: 'ROWS',
      values: rows
    })
  });

  if (!updateRes.ok) {
    throw new Error('Falha ao atualizar a planilha online.');
  }

  return spreadsheetId;
};

export const fetchHistoryFromSheets = async (): Promise<VisitData[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado no Google.");

  // 1. Find spreadsheet
  const dRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!dRes.ok) {
    const errorBody = await dRes.text();
    throw new Error(`Drive API Error: ${errorBody}`);
  }
  const dData = await dRes.json();
  if (!dData.files || dData.files.length === 0) {
    return []; // No backup exists online
  }
  const spreadsheetId = dData.files[0].id;

  // 2. Get sheet name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!metaRes.ok) {
    const errorBody = await metaRes.text();
    throw new Error(`Sheets API Error (meta load): ${errorBody}`);
  }
  const meta = await metaRes.json();
  const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  // 3. Read data
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?valueRenderOption=UNFORMATTED_VALUE`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Sheets API Error (read): ${errorBody}`);
  }
  const data = await res.json();
  if (!data.values || data.values.length <= 1) {
    return [];
  }

  const rows = data.values;
  const headers = rows[0];
  const visits: VisitData[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const getVal = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 && idx < row.length ? row[idx] : undefined;
    };

    const id = Number(getVal('ID')) || Date.now();
    const producer = String(getVal('Cliente_Associado') ?? '');
    const farm = String(getVal('Unidade_Produtor') ?? '');
    const batch = getVal('Lote') !== undefined ? String(getVal('Lote')) : '';
    const date = String(getVal('Data_Visita') ?? new Date().toISOString().slice(0, 10));
    const phase = String(getVal('Fase_Producao') ?? '') as any;
    const feed = String(getVal('Racao_Atual') ?? '');
    const meds = String(getVal('Protocolo_Medicamentoso') ?? '');
    const housingDate = String(getVal('Data_Alojamento') ?? '');
    const totalAnimals = Number(getVal('Total_Animais')) || 0;
    const mortality = Number(getVal('Mortalidade_Lote')) || 0;
    const temp = String(getVal('Temperatura_C') ?? '');
    const humidity = String(getVal('Umidade_Relativa') ?? '');
    const co2 = String(getVal('CO2_ppm') ?? '');
    const duration = String(getVal('Duracao_Sintomas') ?? 'Insignificante (< 24h)') as any;

    const counts = {
      cough: Number(getVal('Contagem_Tosse')) || 0,
      sneeze: Number(getVal('Contagem_Espirro')) || 0,
      e2: Number(getVal('Contagem_Fezes_Pastosas')) || 0,
      e3: Number(getVal('Contagem_Fezes_Liquidas')) || 0
    };

    const rawNotes = getVal('Observacoes');
    const notes = rawNotes ? String(rawNotes) : '';
    let images: string[] = [];
    try {
      const imVal = getVal('Imagens_Urls');
      if (imVal) images = JSON.parse(String(imVal));
    } catch {
      images = [];
    }

    const results = calculateVisitResults({
      id, producer, farm, batch, date, phase, feed, meds, housingDate, totalAnimals, mortality, temp, humidity, co2, duration, counts
    });

    visits.push({
      id, producer, farm, batch, date, phase, feed, meds, housingDate, mortality, totalAnimals, temp, humidity, co2, duration, counts, results, notes, images
    });
  }

  return visits;
};

export const getOnlineSpreadsheetUrl = async (): Promise<string | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  const dRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!dRes.ok) {
    return null;
  }
  const dData = await dRes.json();
  if (!dData.files || dData.files.length === 0) {
    return null;
  }
  return `https://docs.google.com/spreadsheets/d/${dData.files[0].id}/edit`;
};
