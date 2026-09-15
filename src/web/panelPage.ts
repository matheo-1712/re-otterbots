// Page de l'interface web, servie telle quelle. String.raw conserve les antislashs du JavaScript de la page
export const PANEL_PAGE = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Re:Otterbots</title>
<style>
	:root {
		color-scheme: light dark;
		--bg: #f3f4f7;
		--card: #ffffff;
		--field: #f9fafb;
		--text: #1c2027;
		--muted: #636a76;
		--border: #dde1e6;
		--accent: #178ea1;
		--accent-soft: #e3f4f7;
		--accent-text: #ffffff;
		--danger: #c93c3c;
		--ok: #2b8a52;
		--warn-bg: #fff3d6;
		--warn-text: #6e4a00;
	}
	@media (prefers-color-scheme: dark) {
		:root {
			--bg: #121418;
			--card: #1b1e24;
			--field: #15171c;
			--text: #e5e7ea;
			--muted: #99a0ab;
			--border: #2d3139;
			--accent: #4fc0d3;
			--accent-soft: #1b3338;
			--accent-text: #0d1417;
			--danger: #ef6d6d;
			--ok: #5fc588;
			--warn-bg: #362c12;
			--warn-text: #f1cf7c;
		}
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
	}
	h1 { margin: 0; font-size: 20px; }
	h2 { margin: 0; font-size: 17px; }
	h3 { margin: 0 0 2px; font-size: 14px; }
	p { margin: 0; }
	.subtitle, .hint { color: var(--muted); }
	.hint { margin: 2px 0 10px; font-size: 13px; }
	code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .9em; }

	/* ----- Mise en page : barre latérale + contenu sur toute la largeur ----- */
	.layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); min-height: 100vh; }
	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		padding: 24px 14px;
		background: var(--card);
		border-right: 1px solid var(--border);
	}
	.brand { padding: 0 8px 20px; }
	.brand .subtitle { font-size: 13px; }
	.content { min-width: 0; padding: 28px 36px 24px; display: flex; flex-direction: column; gap: 18px; }
	@media (max-width: 860px) {
		.layout { grid-template-columns: 1fr; }
		.sidebar { position: static; height: auto; padding: 16px; border-right: 0; border-bottom: 1px solid var(--border); }
		.brand { padding: 0 0 12px; }
		.content { padding: 20px 16px; }
	}

	/* ----- Champs et boutons ----- */
	input[type="text"], input[type="number"], select, textarea {
		width: 100%;
		padding: 7px 9px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--field);
		color: inherit;
		font: inherit;
	}
	input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus, button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
	.mono { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 14px; }
	textarea { min-height: 120px; resize: vertical; }
	button {
		padding: 7px 14px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--card);
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	button:hover:not(:disabled) { border-color: var(--muted); }
	button:disabled { opacity: .6; cursor: default; }
	button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); font-weight: 600; }
	button.small { padding: 3px 10px; font-size: 13px; }
	fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
	fieldset:disabled { opacity: .55; }

	/* ----- Liste des bots ----- */
	.bots-head { display: flex; justify-content: space-between; align-items: center; padding: 0 8px; margin-bottom: 8px; }
	.bots-head h2 { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
	.bots { display: flex; flex-direction: column; gap: 4px; }
	.bot {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px;
		border-color: transparent;
		background: transparent;
		text-align: left;
	}
	.bot:hover:not(:disabled) { border-color: transparent; background: var(--bg); }
	.bot.selected, .bot.selected:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-soft); }
	.bot-text { display: flex; flex-direction: column; min-width: 0; }
	.bot-name, .bot-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bot-name { font-weight: 600; }
	.bot-detail { font-size: 12px; color: var(--muted); }
	@media (max-width: 860px) {
		.bots { flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
		.bot { width: auto; max-width: 240px; flex: none; }
	}

	/* ----- Photo de profil, avec pastille d'état ----- */
	.avatar { position: relative; flex: none; width: 38px; height: 38px; }
	.avatar .initial, .avatar img { width: 100%; height: 100%; border-radius: 50%; }
	.avatar .initial {
		display: grid;
		place-items: center;
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 700;
	}
	.avatar img { position: absolute; inset: 0; object-fit: cover; }
	.avatar .dot {
		position: absolute;
		right: -2px;
		bottom: -2px;
		width: 13px;
		height: 13px;
		border: 2px solid var(--card);
		border-radius: 50%;
		background: var(--muted);
	}
	.bot.selected .avatar .dot { border-color: var(--accent-soft); }
	.avatar .dot.online { background: var(--ok); }
	.avatar .dot.unreachable { background: var(--danger); }
	.avatar.large { width: 60px; height: 60px; }
	.avatar.large .initial { font-size: 24px; }
	.avatar.large .dot { width: 17px; height: 17px; border-width: 3px; border-color: var(--bg); }

	/* ----- En-tête du bot choisi ----- */
	.bot-header { display: flex; align-items: center; gap: 16px; }
	.bot-header .bot-name { font-size: 22px; font-weight: 700; }
	.bot-header .bot-detail { font-size: 14px; }

	.unavailable {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 22px 24px;
		background: var(--card);
		border: 1px solid var(--border);
		border-left: 4px solid var(--danger);
		border-radius: 12px;
	}
	.unavailable-message { color: var(--danger); font-weight: 600; }

	.warning { padding: 10px 14px; border-radius: 8px; background: var(--warn-bg); color: var(--warn-text); font-size: 14px; }

	/* ----- Module OtterGuard et onglets ----- */
	.module { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px 24px 24px; }
	.module-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
	.tabs { display: flex; gap: 2px; margin: 18px 0 20px; border-bottom: 1px solid var(--border); overflow-x: auto; overflow-y: hidden; }
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-bottom: -1px;
		padding: 10px 14px;
		border: 0;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		background: transparent;
		color: var(--muted);
		font-weight: 600;
		white-space: nowrap;
	}
	.tab:hover:not(:disabled) { color: var(--text); border-color: transparent; border-bottom-color: var(--border); }
	.tab[aria-selected="true"], .tab[aria-selected="true"]:hover:not(:disabled) { color: var(--accent); border-bottom-color: var(--accent); }
	.badge { padding: 1px 8px; border-radius: 10px; background: var(--bg); color: var(--muted); font-size: 12px; }
	.badge.on { background: var(--accent-soft); color: var(--accent); }

	.panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
	@media (max-width: 420px) { .panel-grid { grid-template-columns: 1fr; } }
	.group { padding: 16px 18px; border: 1px solid var(--border); border-radius: 10px; }
	/* Les éléments qui ont un display (grid, flex…) ne sont masqués par l'attribut hidden qu'avec cette règle */
	[hidden] { display: none !important; }
	.group .field + .field { margin-top: 18px; }

	.checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
	.checkbox input { width: 16px; height: 16px; margin: 0; accent-color: var(--accent); }
	.checkbox-hint { margin: 4px 0 0 24px; }
	.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
	.fields label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }

	/* ----- Motifs bloqués ----- */
	.pattern {
		display: grid;
		grid-template-columns: 120px minmax(0, 3fr) minmax(0, 2fr) 38px;
		grid-template-areas: "type value reason remove";
		gap: 8px;
		margin-bottom: 8px;
	}
	.pattern .type { grid-area: type; }
	.pattern .value { grid-area: value; }
	.pattern .reason { grid-area: reason; }
	.pattern .remove { grid-area: remove; padding: 0; color: var(--muted); }
	.pattern .remove:hover:not(:disabled) { color: var(--danger); border-color: var(--danger); }
	.pattern-head { margin-bottom: 4px; font-size: 12px; font-weight: 600; color: var(--muted); }
	@media (max-width: 640px) {
		.pattern {
			grid-template-columns: 1fr 38px;
			grid-template-areas: "type remove" "value value" "reason reason";
			padding-bottom: 8px;
			border-bottom: 1px dashed var(--border);
		}
		.pattern-head { display: none; }
	}
	.empty { margin: 4px 0 12px; color: var(--muted); font-size: 14px; font-style: italic; }

	/* ----- Interrupteur ----- */
	.switch { position: relative; display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; }
	.switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.switch .track {
		position: relative;
		flex: none;
		width: 44px;
		height: 24px;
		border-radius: 12px;
		background: var(--border);
		transition: background .15s;
	}
	.switch .track::after {
		content: "";
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		transition: transform .15s;
	}
	.switch input:checked + .track { background: var(--ok); }
	.switch input:checked + .track::after { transform: translateX(20px); }
	.switch input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; }

	/* ----- Barre d'enregistrement ----- */
	.actions {
		position: sticky;
		bottom: 16px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-shadow: 0 4px 16px rgb(0 0 0 / .06);
	}
	.status { margin-left: auto; font-size: 14px; color: var(--muted); }
	.status.ok { color: var(--ok); }
	.status.error { color: var(--danger); }
</style>
</head>
<body>
<div class="layout">
	<aside class="sidebar">
		<div class="brand">
			<h1>Re:Otterbots</h1>
			<p class="subtitle">Configuration des bots</p>
		</div>
		<div class="bots-head">
			<h2 id="bots-title">Bots</h2>
			<button type="button" class="small" id="refresh-bots">Actualiser</button>
		</div>
		<nav class="bots" id="bots" aria-labelledby="bots-title"></nav>
	</aside>

	<main class="content">
		<header class="bot-header" id="bot-header" hidden></header>

		<p class="warning" id="memory-warning" hidden>
			Ce bot n'a pas chargé de fichier de configuration (<code>loadConfig</code>) : les modifications s'appliquent
			mais seront perdues à son redémarrage.
		</p>

		<section class="unavailable" id="unavailable" hidden>
			<h2>Impossible de charger les réglages de ce bot</h2>
			<p class="unavailable-message" id="unavailable-message"></p>
			<p class="hint">Vérifie que le bot est lancé, que son API est joignable depuis ce service et que le token correspond.</p>
			<button type="button" id="retry">Réessayer</button>
		</section>

		<fieldset class="module" id="settings" disabled>
			<div class="module-head">
				<div>
					<h2>OtterGuard</h2>
					<p class="hint" style="margin: 0">Supprime les messages qui correspondent aux motifs bloqués et arrête le spam.</p>
				</div>
				<label class="switch">
					<span id="enabled-label">…</span>
					<input type="checkbox" id="enabled" role="switch">
					<span class="track"></span>
				</label>
			</div>

			<div class="tabs" role="tablist" aria-label="Réglages d'OtterGuard" id="tabs">
				<button type="button" class="tab" role="tab" id="tab-general" data-tab="general" aria-controls="panel-general">
					Général
				</button>
				<button type="button" class="tab" role="tab" id="tab-patterns" data-tab="patterns" aria-controls="panel-patterns">
					Motifs bloqués <span class="badge" id="patterns-count">0</span>
				</button>
				<button type="button" class="tab" role="tab" id="tab-antispam" data-tab="antispam" aria-controls="panel-antispam">
					Anti-spam <span class="badge" id="antispam-state">…</span>
				</button>
			</div>

			<form id="form" autocomplete="off">
				<section class="panel" role="tabpanel" id="panel-general" aria-labelledby="tab-general">
					<div class="panel-grid">
						<div class="group">
							<div class="field">
								<h3><label for="log-channel">Salon de logs</label></h3>
								<p class="hint">ID du salon où chaque suppression est signalée. Vide : aucun log sur Discord.</p>
								<input type="text" id="log-channel" class="mono" placeholder="123456789012345678">
							</div>
							<div class="field">
								<label class="checkbox">
									<input type="checkbox" id="console-log">
									Signaler aussi chaque suppression dans la console du bot
								</label>
								<p class="hint checkbox-hint">
									Une ligne avec les IDs du serveur, du salon et de l'auteur, et le motif. Jamais le contenu du message.
								</p>
							</div>
						</div>
						<div class="group">
							<h3><label for="exempt-roles">Rôles exemptés</label></h3>
							<p class="hint">
								IDs des rôles dont les messages ne sont jamais vérifiés (motifs et anti-spam), un par ligne.
								Pense aux rôles des bots de confiance.
							</p>
							<textarea id="exempt-roles" class="mono" placeholder="234567890123456789"></textarea>
						</div>
					</div>
				</section>

				<section class="panel" role="tabpanel" id="panel-patterns" aria-labelledby="tab-patterns" hidden>
					<p class="hint">
						Insensible à la casse, sur n'importe quelle partie du message. <strong>Texte</strong> : recherché tel quel.
						<strong>Regex</strong> : expression régulière. La raison est affichée dans le log.
					</p>
					<p class="empty" id="patterns-empty">Aucun motif : aucun message n'est supprimé.</p>
					<div class="pattern pattern-head" id="patterns-head" aria-hidden="true">
						<span class="type">Type</span>
						<span class="value">Motif</span>
						<span class="reason">Raison</span>
						<span class="remove"></span>
					</div>
					<div id="patterns"></div>
					<button type="button" id="add-pattern">+ Ajouter un motif</button>
				</section>

				<section class="panel" role="tabpanel" id="panel-antispam" aria-labelledby="tab-antispam" hidden>
					<p class="hint">
						Un même auteur, bots compris, qui écrit dans plusieurs salons différents en peu de temps : ses messages sont
						supprimés et il peut être exclu temporairement (permission « Exclure temporairement des membres »).
					</p>
					<label class="checkbox">
						<input type="checkbox" id="anti-spam-enabled">
						Activer l'anti-spam
					</label>
					<div class="fields">
						<label>Salons différents<input type="number" id="anti-spam-channels" min="2" max="50"></label>
						<label>En moins de (secondes)<input type="number" id="anti-spam-seconds" min="1" max="300"></label>
						<label>Exclusion (minutes, 0 : aucune)<input type="number" id="anti-spam-timeout" min="0" max="40320"></label>
					</div>
				</section>
			</form>
		</fieldset>

		<div class="actions" id="actions">
			<button type="button" class="primary" id="save" disabled>Enregistrer</button>
			<button type="button" id="reset" disabled>Annuler les modifications</button>
			<span class="status" id="status" role="status"></span>
		</div>
	</main>
</div>

<script>
	const $ = (id) => document.getElementById(id);

	let bots = [];
	let currentId = null;
	// Onglet affiché, conservé quand on change de bot
	let activeTab = 'general';
	// État « enabled » connu du bot, renvoyé tel quel à l'enregistrement du formulaire
	let enabled = true;
	let dirty = false;

	async function api(method, path, body) {
		const options = { method, headers: {} };
		if (body !== undefined) {
			options.headers['Content-Type'] = 'application/json';
			options.body = JSON.stringify(body);
		}

		const res = await fetch(path, options);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || 'Erreur ' + res.status);
		}
		return data;
	}

	function botPath(suffix) {
		return '/api/bots/' + encodeURIComponent(currentId) + '/otterguard' + suffix;
	}

	function setStatus(text, kind) {
		$('status').textContent = text;
		$('status').className = 'status ' + (kind || '');
	}

	function setDirty(value) {
		dirty = value;
		if (value) {
			setStatus('Modifications non enregistrées');
		}
	}

	function setEditable(editable) {
		$('settings').disabled = !editable;
		$('save').disabled = !editable;
		$('reset').disabled = !editable;
	}

	// ----- Onglets -----

	function visibleTabs() {
		return [...document.querySelectorAll('[role="tab"]')].filter((tab) => !tab.hidden);
	}

	function selectTab(name, focus) {
		if (!visibleTabs().some((tab) => tab.dataset.tab === name)) {
			name = 'general';
		}
		activeTab = name;

		for (const tab of document.querySelectorAll('[role="tab"]')) {
			const selected = tab.dataset.tab === name;
			tab.setAttribute('aria-selected', String(selected));
			tab.tabIndex = selected ? 0 : -1;
			$(tab.getAttribute('aria-controls')).hidden = !selected;
			if (selected && focus) {
				tab.focus();
			}
		}
	}

	$('tabs').addEventListener('click', (event) => {
		const tab = event.target.closest('[role="tab"]');
		if (tab) {
			selectTab(tab.dataset.tab);
		}
	});

	// Flèches, Début et Fin pour passer d'un onglet à l'autre au clavier
	$('tabs').addEventListener('keydown', (event) => {
		const tabs = visibleTabs();
		const index = tabs.findIndex((tab) => tab.dataset.tab === activeTab);
		const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
		if (!(event.key in moves)) {
			return;
		}

		event.preventDefault();
		const next = tabs[(moves[event.key] + tabs.length) % tabs.length];
		selectTab(next.dataset.tab, true);
	});

	function updateBadges() {
		$('patterns-count').textContent = $('patterns').children.length;
		const antiSpamOn = $('anti-spam-enabled').checked;
		$('antispam-state').textContent = antiSpamOn ? 'activé' : 'désactivé';
		$('antispam-state').classList.toggle('on', antiSpamOn);
	}

	// ----- Liste des bots -----

	function statusOf(bot) {
		if (bot.error) {
			return { className: 'unreachable', label: 'Injoignable' };
		}
		return bot.online ? { className: 'online', label: 'En ligne' } : { className: '', label: 'Hors ligne' };
	}

	function describeBot(bot) {
		if (bot.error) {
			return bot.error;
		}

		const parts = [];
		if (bot.local) {
			parts.push('Ce service');
		}
		if (bot.tag && bot.tag !== bot.name) {
			parts.push(bot.tag);
		}
		parts.push(bot.online ? bot.guilds + (bot.guilds > 1 ? ' serveurs' : ' serveur') : 'Hors ligne sur Discord');
		return parts.join(' · ');
	}

	// Photo de profil, avec l'initiale du nom en attendant (ou si l'image ne charge pas)
	function createAvatar(bot, large) {
		const avatar = document.createElement('span');
		avatar.className = 'avatar' + (large ? ' large' : '');

		const initial = document.createElement('span');
		initial.className = 'initial';
		initial.textContent = (bot.name || '?').charAt(0).toUpperCase();
		avatar.append(initial);

		if (bot.avatarUrl) {
			const image = document.createElement('img');
			image.src = bot.avatarUrl;
			image.alt = '';
			image.referrerPolicy = 'no-referrer';
			image.addEventListener('error', () => image.remove());
			avatar.append(image);
		}

		const status = statusOf(bot);
		const dot = document.createElement('span');
		dot.className = 'dot ' + status.className;
		dot.title = status.label;
		avatar.append(dot);

		return avatar;
	}

	function createBotText(bot, nameTag) {
		const text = document.createElement('span');
		text.className = 'bot-text';

		const name = document.createElement(nameTag);
		name.className = 'bot-name';
		name.textContent = bot.name;

		const detail = document.createElement('span');
		detail.className = 'bot-detail';
		detail.textContent = describeBot(bot);

		text.append(name, detail);
		return text;
	}

	function renderBots() {
		const list = $('bots');
		list.replaceChildren();

		for (const bot of bots) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'bot' + (bot.id === currentId ? ' selected' : '');
			button.setAttribute('aria-current', bot.id === currentId ? 'true' : 'false');
			button.append(createAvatar(bot, false), createBotText(bot, 'span'));
			button.addEventListener('click', () => selectBot(bot.id));
			list.append(button);
		}

		const current = bots.find((bot) => bot.id === currentId);
		$('bot-header').hidden = !current;
		if (current) {
			$('bot-header').replaceChildren(createAvatar(current, true), createBotText(current, 'h2'));
		}
	}

	async function loadBots() {
		try {
			bots = await api('GET', '/api/bots');
		}
		catch (error) {
			setStatus('Chargement des bots impossible : ' + error.message, 'error');
			return;
		}

		if (bots.length === 0) {
			setStatus('Aucun bot configuré', 'error');
			return;
		}

		const wanted = currentId || decodeURIComponent(location.hash.slice(1));
		if (bots.some((bot) => bot.id === wanted)) {
			if (wanted === currentId) {
				renderBots();
			}
			else {
				await selectBot(wanted);
			}
		}
		else {
			await selectBot(bots[0].id);
		}
	}

	async function selectBot(id) {
		if (id === currentId) {
			return;
		}
		if (dirty && !confirm('Des modifications ne sont pas enregistrées. Changer de bot quand même ?')) {
			return;
		}

		currentId = id;
		history.replaceState(null, '', '#' + encodeURIComponent(id));
		renderBots();
		await loadSettings();
	}

	// ----- Réglages d'OtterGuard -----

	function renderEnabled(value) {
		enabled = value;
		$('enabled').checked = value;
		$('enabled-label').textContent = value ? 'Activé' : 'Désactivé';
	}

	function updatePatternsEmpty() {
		const empty = $('patterns').children.length === 0;
		$('patterns-empty').hidden = !empty;
		$('patterns-head').hidden = empty;
		updateBadges();
	}

	function textInput(className, placeholder, value, label) {
		const input = document.createElement('input');
		input.type = 'text';
		input.className = className;
		input.placeholder = placeholder;
		input.value = value;
		input.setAttribute('aria-label', label);
		return input;
	}

	function addPattern(pattern) {
		const row = document.createElement('div');
		row.className = 'pattern';

		const type = document.createElement('select');
		type.className = 'type';
		type.setAttribute('aria-label', 'Type de motif');
		for (const [value, label] of [['text', 'Texte'], ['regex', 'Regex']]) {
			const option = document.createElement('option');
			option.value = value;
			option.textContent = label;
			type.append(option);
		}
		type.value = pattern.type;

		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'remove';
		remove.textContent = '✕';
		remove.title = 'Supprimer ce motif';
		remove.setAttribute('aria-label', 'Supprimer ce motif');
		remove.addEventListener('click', () => {
			row.remove();
			updatePatternsEmpty();
			setDirty(true);
		});

		row.append(
			type,
			textInput('value mono', 'http://', pattern.value, 'Motif'),
			textInput('reason', 'Raison (optionnelle)', pattern.reason, 'Raison'),
			remove,
		);
		$('patterns').append(row);
		updatePatternsEmpty();
		return row;
	}

	function render(data) {
		renderEnabled(data.enabled);
		$('patterns').replaceChildren();
		data.blockedPatterns.forEach(addPattern);
		updatePatternsEmpty();
		$('exempt-roles').value = data.exemptRoles.join('\n');
		$('log-channel').value = data.logChannel || '';
		// Absent chez un bot plus ancien : affiché comme activé, son comportement par défaut
		$('console-log').checked = data.consoleLog !== false;

		// Absent chez un bot plus ancien : onglet masqué
		$('tab-antispam').hidden = !data.antiSpam;
		if (data.antiSpam) {
			$('anti-spam-enabled').checked = data.antiSpam.enabled;
			$('anti-spam-channels').value = data.antiSpam.channels;
			$('anti-spam-seconds').value = data.antiSpam.seconds;
			$('anti-spam-timeout').value = data.antiSpam.timeoutMinutes;
		}

		$('memory-warning').hidden = data.persistent;
		updateBadges();
		selectTab(activeTab);
		dirty = false;
	}

	// Les lignes de motif vides sont ignorées
	function collect() {
		const patterns = [...$('patterns').children]
			.map((row) => ({
				type: row.querySelector('.type').value,
				value: row.querySelector('.value').value,
				reason: row.querySelector('.reason').value,
			}))
			.filter((pattern) => pattern.value.trim() !== '');

		return {
			enabled,
			blockedPatterns: patterns,
			exemptRoles: $('exempt-roles').value.split(/\s+/).filter(Boolean),
			logChannel: $('log-channel').value.trim() || null,
			consoleLog: $('console-log').checked,
			// Non envoyé (undefined) si le bot ne gère pas l'anti-spam
			antiSpam: $('tab-antispam').hidden ? undefined : {
				enabled: $('anti-spam-enabled').checked,
				channels: Number($('anti-spam-channels').value),
				seconds: Number($('anti-spam-seconds').value),
				timeoutMinutes: Number($('anti-spam-timeout').value),
			},
		};
	}

	// Bot injoignable : les réglages du bot précédent ne doivent pas rester affichés
	function showAvailability(available, message) {
		$('settings').hidden = !available;
		$('actions').hidden = !available;
		$('unavailable').hidden = available;
		$('unavailable-message').textContent = message || '';
	}

	async function loadSettings() {
		const id = currentId;
		setEditable(false);
		dirty = false;
		setStatus('Chargement…');

		try {
			const data = await api('GET', botPath(''));
			// Un autre bot a été choisi pendant le chargement
			if (id !== currentId) {
				return;
			}
			render(data);
			showAvailability(true);
			setEditable(true);
			setStatus('');
		}
		catch (error) {
			if (id === currentId) {
				$('memory-warning').hidden = true;
				showAvailability(false, error.message);
				setStatus('');
			}
		}
	}

	$('enabled').addEventListener('change', async (event) => {
		const toggle = event.target;
		const value = toggle.checked;
		toggle.disabled = true;

		// Appliqué immédiatement, sans toucher aux modifications en cours du formulaire
		try {
			const data = await api('PUT', botPath('/enabled'), { enabled: value });
			renderEnabled(data.enabled);
			setStatus(data.enabled ? 'OtterGuard activé' : 'OtterGuard désactivé', 'ok');
		}
		catch (error) {
			renderEnabled(!value);
			setStatus(error.message, 'error');
		}
		finally {
			toggle.disabled = false;
		}
	});

	$('form').addEventListener('input', () => {
		updateBadges();
		setDirty(true);
	});
	$('form').addEventListener('submit', (event) => event.preventDefault());

	$('add-pattern').addEventListener('click', () => {
		addPattern({ type: 'text', value: '', reason: '' }).querySelector('.value').focus();
		setDirty(true);
	});

	$('save').addEventListener('click', async () => {
		$('save').disabled = true;
		setStatus('Enregistrement…');

		try {
			render(await api('PUT', botPath(''), collect()));
			setStatus('Enregistré', 'ok');
		}
		catch (error) {
			setStatus(error.message, 'error');
		}
		finally {
			$('save').disabled = false;
		}
	});

	$('reset').addEventListener('click', loadSettings);
	$('refresh-bots').addEventListener('click', loadBots);

	// Relit l'état des bots (pastille, raison de l'erreur) puis les réglages
	$('retry').addEventListener('click', async () => {
		await loadBots();
		await loadSettings();
	});

	window.addEventListener('beforeunload', (event) => {
		if (dirty) {
			event.preventDefault();
		}
	});

	selectTab(activeTab);
	loadBots();
</script>
</body>
</html>
`;
