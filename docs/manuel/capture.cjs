// Captures d'écran du logiciel pour le mode d'emploi (données d'exemple fictives).
const puppeteer = require('puppeteer-core')
const path = require('path')
const fs = require('fs')

const FRONT = 'http://localhost:5173'
const API = 'http://localhost:8000/api'
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

  // 15 / 16 / 17 — en-tête, récapitulation, explorateur
  await clickText('En-tête', 'main button')
  await shot('15-devis-entete')
  await clickText('Récapitulation', 'main button')
  await shot('16-devis-recap', { x: 320, y: 190, width: 1120, height: 420 })
  await clickText('Explorateur', 'main button')
  await wait(1200)
  await shot('17-devis-explorateur', { x: 320, y: 150, width: 1120, height: 300 })

  // 18 — utilisateurs
  await go('/users')
  await shot('18-utilisateurs', { x: 0, y: 0, width: 1440, height: 560 })

  // 19 — vue ouvrier
  await loginAs('ouvrier@chantier.test')
  await go('/projets?id=1')
  await shot('19-ouvrier')

  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
