// Captures d'écran du logiciel pour le mode d'emploi (données d'exemple fictives).
const puppeteer = require('puppeteer-core')
const path = require('path')
const fs = require('fs')

// Ports du dev.bat par défaut ; surchargeables : FRONT_URL=http://localhost:5177 API_URL=http://localhost:8007 node capture.cjs
const FRONT = process.env.FRONT_URL || 'http://localhost:5174'
const API = (process.env.API_URL || 'http://localhost:8001') + '/api'
const OUT = path.join(__dirname, 'shots')
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function token(email) {
  const response = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password: 'password', device_name: 'manuel' }),
  })
  return (await response.json()).token
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1440, height: 860, deviceScaleFactor: 1.5 },
    args: ['--lang=fr-CH', '--hide-scrollbars'],
  })
  const page = await browser.newPage()
  // Les confirmations (« Remplacer les lignes actuelles… ») bloqueraient le navigateur sans interface.
  page.on('dialog', (dialog) => void dialog.accept())
  const shot = async (name, clip) => {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), ...(clip ? { clip } : {}) })
    console.log('ok', name)
  }
  const go = async (url, ms = 1800) => {
    await page.goto(FRONT + url, { waitUntil: 'networkidle0' })
    await wait(ms)
  }
  const clickText = async (text, scope = 'button') => {
    await page.evaluate(
      (t, s) => [...document.querySelectorAll(s)].find((el) => el.innerText.trim().startsWith(t))?.click(),
      text,
      scope,
    )
    await wait(700)
  }
  const loginAs = async (email) => {
    const value = await token(email)
    await page.evaluate((t) => localStorage.setItem('baseapp_token', t), value)
  }
  // Projet courant de la barre de contexte (perdu à chaque rechargement de page : à refaire après chaque go()).
  const selectProject = async (number) => {
    await page.evaluate((n) => {
      const select = [...document.querySelectorAll('header select, select')].find((s) => [...s.options].some((o) => o.text.startsWith(n)))
      const value = [...select.options].find((o) => o.text.startsWith(n)).value
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }, number)
    await wait(1800)
  }
  const clickTitle = async (prefix, index = 0) => {
    await page.evaluate((t, i) => [...document.querySelectorAll(`button[title^="${t}"]`)][i]?.click(), prefix, index)
    await wait(900)
  }

  // 01 — connexion
  await go('/login', 800)
  await page.evaluate(() => localStorage.clear())
  await go('/login', 800)
  await shot('01-connexion')

  await loginAs('admin@chantier.test')

  // 02 — accueil
  await go('/dashboard')
  await shot('02-accueil')

  // 03 — recherche instantanée (avec une faute de frappe volontaire)
  await page.click('input[type=search]')
  await page.keyboard.type('carelage', { delay: 40 })
  await wait(500)
  await shot('03-recherche', { x: 560, y: 0, width: 880, height: 430 })
  await page.keyboard.press('Escape')

  // 04 / 05 — adresses
  await go('/clients')
  await shot('04-adresses')
  await clickText('Nouvelle adresse')
  await page.type('input[name=last_name]', 'Berger')
  await page.type('input[name=first_name]', 'Claire')
  await page.type('input[name=street]', 'Rue du Moulin')
  await page.type('input[name=zip]', '2800')
  await page.type('input[name=city]', 'Delémont')
  await wait(400)
  await shot('05-adresse-nouvelle', { x: 0, y: 150, width: 1440, height: 330 })

  // 06 — catalogue, chapitre 12
  await go('/catalogue')
  await page.evaluate(() => [...document.querySelectorAll('aside .select-none span')].find((el) => el.innerText.startsWith('12 -'))?.click())
  await wait(1500)
  await shot('06-catalogue')

  // 07 — éléments de coûts
  await go('/listes-prix')
  await shot('07-elements-couts')

  // 08 — projets
  await go('/projets?id=1')
  await shot('08-projets')

  // 09 — nouveau projet : le client pré-remplit la fiche, le numéro est proposé
  await go('/projets?id=new')
  const clientValue = await page.evaluate(
    () => [...document.querySelector('select[name=client_id]').options].find((o) => o.text.startsWith('Muller'))?.value,
  )
  await page.select('select[name=client_id]', clientValue)
  await wait(1800)
  await page.click('input[name=designation1]')
  await page.keyboard.press('End')
  await page.keyboard.type('Rénovation cuisine')
  await wait(400)
  await shot('09-projet-nouveau', { x: 280, y: 150, width: 1160, height: 400 })

  // 10 — adresses du projet
  await go('/projets?id=1')
  await clickText('Adresses', 'main button')
  await shot('10-projet-adresses', { x: 0, y: 150, width: 1440, height: 400 })

  // 11 — photos du projet (zone d'envoi)
  await clickText('Photos', 'main button')
  await shot('11-projet-photos', { x: 280, y: 190, width: 1160, height: 360 })

  // 12 — devis : détail
  await go('/documents?id=1', 2500)
  await shot('12-devis-detail')

  // 13 — devis : saisie rapide avec faute de frappe
  await page.evaluate(() => {
    const body = [...document.querySelectorAll('main section tbody')].find((tb) => tb.querySelector('tr').innerText.includes('CARRELAGE'))
    body.querySelector('[data-picker]').scrollIntoView({ block: 'center' })
  })
  await wait(400)
  const pickerStep = await page.evaluate(() => {
    const body = [...document.querySelectorAll('main section tbody')].find((tb) => tb.querySelector('tr').innerText.includes('CARRELAGE'))
    return body.querySelector('[data-picker]').getAttribute('data-picker')
  })
  await page.click(`[data-picker="${pickerStep}"]`)
  await page.keyboard.type('bagete angle', { delay: 40 })
  await wait(500)
  const box = await page.evaluate((id) => {
    const rect = document.querySelector(`[data-picker="${id}"]`).getBoundingClientRect()
    return { y: rect.top }
  }, pickerStep)
  await shot('13-devis-saisie-rapide', { x: 320, y: Math.max(150, box.y - 250), width: 1120, height: 400 })
  await page.keyboard.press('Escape')
  await page.evaluate((id) => {
    const input = document.querySelector(`[data-picker="${id}"]`)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  }, pickerStep)

  // 14 — devis : panneau des étapes et modèles
  await go('/documents?id=1', 2500)
  const modelValue = await page.evaluate(() => {
    const select = [...document.querySelectorAll('aside select')].find((s) => s.options[0].text.includes('modèle'))
    return [...select.options].find((o) => o.text.includes('04 - TERRASSEMENT'))?.value
  })
  await page.evaluate((value) => {
    const select = [...document.querySelectorAll('aside select')].find((s) => s.options[0].text.includes('modèle'))
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, modelValue)
  await wait(400)
  await shot('14-devis-etapes', { x: 0, y: 150, width: 330, height: 680 })

  // 15 / 16 / 17 — en-tête, récapitulation, liste de tous les documents (sans devis ouvert)
  await clickText('En-tête', 'main button')
  await shot('15-devis-entete')
  await clickText('Récapitulation', 'main button')
  await shot('16-devis-recap', { x: 320, y: 190, width: 1120, height: 420 })
  await go('/documents', 2200)
  await shot('17-devis-explorateur', { x: 320, y: 150, width: 1120, height: 300 })

  // 18 — utilisateurs
  await go('/users')
  await shot('18-utilisateurs', { x: 0, y: 0, width: 1440, height: 560 })

  // 19 — vue ouvrier
  await loginAs('ouvrier@chantier.test')
  await go('/projets?id=1')
  await shot('19-ouvrier')
  await loginAs('admin@chantier.test')

  // 20 — devis : aperçu avant impression (PDF)
  await go('/documents?id=1', 2500)
  await clickText('Aperçu', 'main button')
  await wait(4000)
  await shot('20-devis-apercu')

  // 21 — devis : sous-détail de prix d'une position (fenêtre), avec un sous-détail type chargé
  await go('/documents?id=1', 2500)
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('main tr')].find((tr) => tr.innerText.includes('Carrelage') || tr.innerText.includes('carrelage'))
    row?.scrollIntoView({ block: 'center' })
    const button = row?.querySelector('button[title*="sous-détail"]') || document.querySelector('button[title*="sous-détail"]')
    button?.click()
  })
  await wait(1200)
  const picker = await page.$('input[placeholder^="Charger un sous-détail type"]')
  if (picker) {
    try {
      await picker.click()
      await page.keyboard.type('carrelage', { delay: 40 })
      await wait(800)
      await page.keyboard.press('Enter')
      await wait(2000)
    } catch (error) {
      console.warn('sous-détail type non chargé :', error.message)
    }
  }
  await shot('21-devis-sous-detail')
  await page.keyboard.press('Escape')
  await wait(500)

  // 22 / 23 — rapports journaliers : liste du projet, en-tête et grille des heures
  await go('/rapports?id=10', 2200)
  await selectProject('2822-001')
  await shot('22-rapports')
  await shot('23-rapport-heures', { x: 430, y: 400, width: 1010, height: 400 })

  // 24 — rapport : ressources (matériaux) rattachées aux étapes
  await go('/rapports?id=7', 2200)
  await selectProject('2822-001')
  await clickText('Matériaux', 'main button')
  await shot('24-rapport-materiaux', { x: 430, y: 150, width: 1010, height: 480 })

  // 25 — collaborateurs : fiche avec position régie, types de travail
  await go('/collaborateurs?id=1', 2200)
  await shot('25-collaborateurs')

  // 26 / 27 — régie : lignes du projet aux trois niveaux de prix, récapitulation
  await go('/regie', 1500)
  await selectProject('2822-001')
  await wait(1500)
  await shot('26-regie')
  await clickText('Récapitulation', 'main button')
  await shot('27-regie-recap', { x: 400, y: 150, width: 1040, height: 420 })

  // 28 / 29 — contrôle des heures : matrice d'un collaborateur, saisie d'une absence
  await go('/controle-heures?mois=2026-08&collaborateur=1', 2500)
  // Défilement vers la fin du mois : vacances et totaux de semaine visibles.
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('div.overflow-auto')].find((d) => d.innerText.includes('Projet / Désignation'))
    if (box) box.scrollLeft = box.scrollWidth
  })
  await wait(400)
  await shot('28-controle-heures')
  await clickTitle('Saisir une absence', 5)
  await shot('29-absence', { x: 380, y: 150, width: 680, height: 420 })
  await page.keyboard.press('Escape')

  // 30 — vue ouvrier d'un rapport journalier : ses heures, aucun montant
  await loginAs('ouvrier@chantier.test')
  await go('/rapports?id=3', 2200)
  await shot('30-ouvrier-rapport')

  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
