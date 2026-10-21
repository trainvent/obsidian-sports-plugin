import { Modal, Notice, Setting } from 'obsidian';
import type { GarminClient, Tokens, TokenStore } from 'garminconnect-js';
import type SportsPlugin from '../main';
import { newGarminClient, tokenStore, type MfaState } from '../garmin/client';

/** Credentials and MFA state exist only while this sign-in dialog is open. */
export class GarminConnectModal extends Modal {
 private active = true;
 private busy = false;
 private client?: GarminClient;
 private mfa?: MfaState;
 private tokens: Tokens | null = null;
 constructor(private plugin: SportsPlugin, private finished: () => void) { super(plugin.app); }
 onOpen(): void { this.credentials(); }
 onClose(): void {
  this.active = false; this.mfa = undefined; this.client = undefined; this.tokens = null;
  this.contentEl.empty(); this.finished();
 }
 private credentials(): void {
  this.setTitle('Connect Garmin');
  this.contentEl.createEl('p', { text: 'Sign in to import activity summaries. Your email, password and verification code go directly to Garmin and are not saved. Session tokens stay in Obsidian secret storage. Imported measurements are stored in this vault.' });
  this.contentEl.createEl('p', { text: 'This unofficial connection also requests public OAuth application keys from thegarth.s3.amazonaws.com. It sends no credentials or training data to that host. Desktop only; no Python setup is needed. Requires Obsidian 1.11.4 or later.' });
  let email = ''; let passwordInput: HTMLInputElement;
  new Setting(this.contentEl).setName('Email').addText(input => { input.inputEl.type = 'email'; input.onChange(value => { email = value.trim(); }); });
  new Setting(this.contentEl).setName('Password').addText(input => { passwordInput = input.inputEl; passwordInput.type = 'password'; });
  const error = this.contentEl.createEl('p');
  new Setting(this.contentEl).addButton(button => button.setButtonText('Connect').setCta().onClick(async () => {
   if (this.busy) return;
   if (!email || !passwordInput.value) { error.setText('Enter your email and password.'); return; }
   if (!this.app.secretStorage) { error.setText('Update Obsidian to 1.11.4 or later to connect Garmin.'); return; }
   const password = passwordInput.value; passwordInput.value = '';
   this.busy = true; button.setDisabled(true); error.setText('Signing in…');
   try {
    const store: TokenStore = {
     load: () => Promise.resolve(this.tokens),
     save: value => { if (this.active) this.tokens = value; return Promise.resolve(); },
     clear: () => { this.tokens = null; return Promise.resolve(); },
    };
    this.client = await newGarminClient(this.app, '', store);
    const result = await this.client.login(email, password);
    if (!this.active) return;
    if (result.state === 'mfa_required') { this.mfa = result.mfaState; this.verification(); }
    else await this.connected();
   } catch { if (this.active) error.setText('Sign-in failed. Check your details, or wait before trying again if Garmin is limiting sign-ins.'); }
   finally { this.busy = false; button.setDisabled(false); }
  }));
 }
 private verification(): void {
  this.contentEl.empty(); this.setTitle('Verify Garmin sign-in');
  this.contentEl.createEl('p', { text: 'Enter the verification code from Garmin.' });
  let codeInput: HTMLInputElement;
  new Setting(this.contentEl).setName('Verification code').addText(input => { codeInput = input.inputEl; codeInput.autocomplete = 'one-time-code'; });
  const error = this.contentEl.createEl('p');
  new Setting(this.contentEl).addButton(button => button.setButtonText('Verify').setCta().onClick(async () => {
   if (this.busy || !this.mfa || !this.client) return;
   const code = codeInput.value.trim(); codeInput.value = '';
   if (!code) { error.setText('Enter the verification code.'); return; }
   this.busy = true; button.setDisabled(true); error.setText('Verifying…');
   try { await this.client.resumeLogin(this.mfa, code); if (this.active) await this.connected(); }
   catch { if (this.active) error.setText('Verification failed. Try the code again, or close this dialog and reconnect.'); }
   finally { this.busy = false; button.setDisabled(false); }
  }));
 }
 private async connected(): Promise<void> {
  if (!this.active || !this.tokens) return;
  const id = this.plugin.data.garminSecretId || `sports-garmin-${crypto.randomUUID()}`;
  await tokenStore(this.app, id).save(this.tokens);
  this.plugin.data.garminSecretId = id;
  this.plugin.data.garminEnabled = true;
  if (!this.plugin.data.garminHistoryStart) {
   const start = new Date(); start.setDate(start.getDate() - 90);
   this.plugin.data.garminHistoryStart = start.toISOString().slice(0, 10);
  }
  await this.plugin.save();
  this.close(); new Notice('Garmin connected. Importing activities.');
  await this.plugin.sync(true);
 }
}
