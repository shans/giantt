let google = require('googleapis');
import {readFileSync} from 'fs';

export async function getSheetData(key: string) {
  const key_data = JSON.parse(readFileSync(key, "utf8"));
  const client_auth = new google.google.auth.JWT(key_data.client_email, undefined, key_data.private_key,
                        ['https://www.googleapis.com/auth/spreadsheets']);
  
  client_auth.authorize();
  const [spreadsheetId, range] = key_data.sheet.split(':');
  const sheets = google.google.sheets('v4');
  const data = await sheets.spreadsheets.values.get({auth: client_auth, spreadsheetId, range});

  return data.data.values;
}
