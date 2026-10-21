/** Classify known failures without exposing response bodies, credentials or token URLs. */
export function garminSignInError(error: unknown, saving = false): string {
 if (saving) return 'Garmin sign-in completed, but the connection could not be saved. Check Obsidian secret storage and try again. (save-connection)';
 let value: unknown = error;
 const messages: string[] = []; const codes: string[] = [];
 for (let depth = 0; depth < 5 && value && typeof value === 'object'; depth++) {
  const entry = value as { message?: unknown; code?: unknown; status?: unknown; name?: unknown; cause?: unknown };
  if (typeof entry.message === 'string') messages.push(entry.message);
  if (typeof entry.code === 'string') codes.push(entry.code);
  if (typeof entry.status === 'number') codes.push(`http-${entry.status}`);
  if (entry.name === 'AbortError') codes.push('timeout');
  value = entry.cause;
 }
 const message = messages.join(' ');
 const stage = message.includes('/oauth-service/') ? 'token-exchange' : message.includes('thegarth.s3.amazonaws.com') ? 'application-keys' : 'sign-in';
 if (/INVALID_USERNAME_PASSWORD|INVALID_CREDENTIALS/.test(message)) return 'Garmin explicitly rejected the sign-in details. Check the account email and password. (credentials-rejected)';
 if (/INVALID_MFA_CODE/.test(message)) return 'Garmin rejected the verification code. Enter a new code, or reconnect. (verification-code)';
 if (/ACCOUNT_RESTRICTED/.test(message)) return 'Garmin reported an account restriction. Check your account in Garmin Connect. (account-restricted)';
 if (codes.includes('http-429') || /429|rate.limit/i.test(message)) return `Garmin is limiting connection requests. Wait before retrying; this does not establish that your password is wrong. (http-429-${stage})`;
 if (codes.includes('http-403') || /\b403\b|cloudflare|non-JSON/i.test(message)) return `Garmin blocked or challenged a connection request. Your password may be correct. (blocked-${stage})`;
 if (codes.includes('http-401') || /\b401\b/.test(message)) return `Garmin did not authorize the connection. Try signing in again later. (http-401-${stage})`;
 if (codes.some(code => /CERT|TLS|SSL/.test(code))) return 'The secure connection to Garmin failed certificate validation. Check the computer clock and network. (tls-connection)';
 if (codes.includes('timeout') || /timed?\s*out|cancelled|aborted/i.test(message)) return 'The Garmin connection timed out. Check your network and try again later. (connection-timeout)';
 if (codes.some(code => /ENOTFOUND|EAI_AGAIN|ECONN|ENET|EHOST/.test(code))) return 'Could not reach Garmin. Check your network connection. (network-connection)';
 if (/Buffer is not defined|require is not defined|not a function|not defined/.test(message)) return 'The Garmin client could not run in this Obsidian window. Reload the plugin and try again. (client-runtime)';
 return `The Garmin connection failed before sign-in could be completed. This does not establish that your credentials are wrong. (connection-${stage})`;
}
