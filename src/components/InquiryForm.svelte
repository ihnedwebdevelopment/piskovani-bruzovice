<script>
  import { siteContent } from "../lib/content-store.js";
  import { tick } from 'svelte';
  import { serviceOptions, validateInquiry } from '../lib/inquiry.js';
  import Icon from './Icon.svelte';
  let fields = { name: '', email: '', phone: '', location: '', service: serviceOptions[0], message: '', privacy: false, website: '' };
  let errors = {};
  let pending = false;
  let receipt = '';
  let failure = '';
  let submissionId = '';
  let previousPayload = '';
  let form;
  let privacyOpen = false;
  $: emailBody = `Dobrý den,\n\nrád/a bych poptal/a: ${fields.service}.\n\n${fields.message}\n\nMísto realizace: ${fields.location || 'dle domluvy'}\nJméno: ${fields.name}\nE-mail: ${fields.email}\nTelefon: ${fields.phone || 'neuveden'}${receipt ? '\nČíslo poptávky: ' + receipt : ''}`;
  $: emailHref = `mailto:${$siteContent.settings.email}?subject=${encodeURIComponent('Poptávka – ' + fields.service)}&body=${encodeURIComponent(emailBody)}`;
  async function submit() {
    if (pending) return;
    const checked = validateInquiry(fields);
    errors = checked.errors;
    failure = '';
    if (!checked.valid) {
      await tick();
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const payload = JSON.stringify(checked.data);
    if (payload !== previousPayload || !submissionId) submissionId = crypto.randomUUID();
    previousPayload = payload;
    pending = true;
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...checked.data, privacy: fields.privacy, website: fields.website, submissionId }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) {
        errors = result.errors || {};
        throw new Error(result.message || 'Poptávku se nepodařilo odeslat. Zkuste to prosím znovu.');
      }
      if (!result.reference) throw new Error('Odeslání se nepodařilo potvrdit. Zkuste to znovu nebo nám napište e-mail.');
      receipt = result.reference;
      await tick();
      document.getElementById('inquiry-success')?.focus();
    } catch (error) {
      failure = error.name === 'TimeoutError' || error instanceof TypeError ? 'Spojení se nepodařilo dokončit. Vaše údaje zůstaly vyplněné. Zkuste odeslání znovu nebo použijte e-mail.' : error.message;
    } finally { pending = false; }
  }
</script>

<div class="inquiry-card reveal">
  {#if receipt}
    <div class="form-success" id="inquiry-success" tabindex="-1" role="status"><span class="success-icon"><Icon name="check" size={32} /></span><p class="eyebrow">{$siteContent.copy["form"].text001} {receipt}</p><h3>{$siteContent.copy["form"].text002}<br />{$siteContent.copy["form"].text003}</h3><p>{$siteContent.copy["form"].text004}</p><a class="button button-accent" href={emailHref}>{$siteContent.copy["form"].text005} <Icon name="mail" /></a></div>
  {:else}
    <div class="form-heading"><div><span class="eyebrow">{$siteContent.copy["form"].text006}</span><h3>{$siteContent.copy["form"].text007}</h3></div><span class="form-time">{$siteContent.copy["form"].text008}</span></div>
    <form bind:this={form} on:submit|preventDefault={submit} novalidate aria-busy={pending}>
      <fieldset disabled={pending}><legend class="field-label">{$siteContent.copy["form"].text009}</legend><div class="service-options">{#each serviceOptions as option}<label class:checked={fields.service === option}><input type="radio" name="service" value={option} bind:group={fields.service} /><span>{option}</span></label>{/each}</div>{#if errors.service}<small class="field-error">{errors.service}</small>{/if}</fieldset>
      <div class="row g-3 mt-1">
        <div class="col-sm-6"><label class="field-label" for="inquiry-name">{$siteContent.copy["form"].text010} <span>*</span></label><input class="form-control" id="inquiry-name" name="name" autocomplete="name" maxlength="100" placeholder="Jan Novák" bind:value={fields.name} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'error-name' : undefined} disabled={pending} required />{#if errors.name}<small id="error-name" class="field-error">{errors.name}</small>{/if}</div>
        <div class="col-sm-6"><label class="field-label" for="inquiry-email">{$siteContent.copy["form"].text011} <span>*</span></label><input class="form-control" type="email" id="inquiry-email" name="email" autocomplete="email" maxlength="254" placeholder="vas@email.cz" bind:value={fields.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'error-email' : undefined} disabled={pending} required />{#if errors.email}<small id="error-email" class="field-error">{errors.email}</small>{/if}</div>
        <div class="col-sm-6"><label class="field-label" for="inquiry-phone">{$siteContent.copy["form"].text012} <small>{$siteContent.copy["form"].text013}</small></label><input class="form-control" type="tel" id="inquiry-phone" name="phone" autocomplete="tel" maxlength="30" placeholder="+420" bind:value={fields.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'error-phone' : undefined} disabled={pending} />{#if errors.phone}<small id="error-phone" class="field-error">{errors.phone}</small>{/if}</div>
        <div class="col-sm-6"><label class="field-label" for="inquiry-location">{$siteContent.copy["form"].text014} <small>{$siteContent.copy["form"].text015}</small></label><input class="form-control" id="inquiry-location" name="location" autocomplete="address-level2" maxlength="140" placeholder="Město nebo obec" bind:value={fields.location} aria-invalid={!!errors.location} disabled={pending} />{#if errors.location}<small class="field-error">{errors.location}</small>{/if}</div>
        <div class="col-12"><label class="field-label" for="inquiry-message">{$siteContent.copy["form"].text016} <span>*</span></label><textarea class="form-control" id="inquiry-message" name="message" rows="4" maxlength="4000" placeholder="Co potřebujete otryskat? Z jakého je to materiálu, jak je to velké a v jakém stavu?" bind:value={fields.message} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'error-message' : 'message-hint'} disabled={pending} required></textarea>{#if errors.message}<small id="error-message" class="field-error">{errors.message}</small>{:else}<small id="message-hint" class="field-hint">{$siteContent.copy["form"].text017}</small>{/if}</div>
      </div>
      <div class="honeypot" aria-hidden="true"><label for="website">{$siteContent.copy["form"].text018}</label><input id="website" name="website" tabindex="-1" autocomplete="off" bind:value={fields.website} /></div>
      <label class="privacy-check"><input type="checkbox" bind:checked={fields.privacy} aria-invalid={!!errors.privacy} aria-describedby={errors.privacy ? 'error-privacy' : undefined} disabled={pending} /><span>{$siteContent.copy["form"].text019}</span></label>
      {#if errors.privacy}<small id="error-privacy" class="field-error">{errors.privacy}</small>{/if}
      <button class="privacy-link" type="button" on:click={() => privacyOpen = !privacyOpen} aria-expanded={privacyOpen}>{$siteContent.copy["form"].text020}</button>
      {#if privacyOpen}<p class="privacy-info">{$siteContent.copy["form"].text021}</p>{/if}
      {#if failure}<div class="form-failure" role="alert">{failure}</div>{/if}
      <button class="button button-accent submit-button" type="submit" disabled={pending}>{#if pending}<span class="loading-ring"></span> {$siteContent.copy["form"].text022}{:else}{$siteContent.copy["form"].text023} <Icon name="arrow" />{/if}</button>
      <div class="form-footnote"><span><Icon name="shield" size={16} /> {$siteContent.copy["form"].text024}</span><a href={emailHref}>{$siteContent.copy["form"].text025} <Icon name="arrow" size={14} /></a></div>
    </form>
  {/if}
</div>
