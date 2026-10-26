# -*- coding: utf-8 -*-
"""
Génère le mode d'emploi PDF de StepBuild (logiciel de gestion de chantier).

    1. Lancer l'application (dev.bat), avec les données d'exemple.
    2. npm install ; npm run captures     -> docs/manuel/shots/*.png
    3. npm run pdf                         -> docs/Mode d'emploi - StepBuild.pdf

Police Helvetica intégrée à reportlab : éviter les caractères hors WinAnsi (flèches, etc.).
"""
import os
from PIL import Image as PilImage, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, ListFlowable, ListItem, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, 'shots')
LOGO = os.path.join(HERE, '..', '..', 'frontend', 'public', 'logo-lachat.png')
OUTPUT = os.path.join(HERE, '..', "Mode d'emploi - StepBuild.pdf")

VERSION = '0.5'
DATE = '26 octobre 2026'

BLUE = colors.HexColor('#1d3f9c')
RED = colors.HexColor('#d32f2f')
ANTHRACITE = colors.HexColor('#1f1f1f')
GREY = colors.HexColor('#6b7280')
LIGHT_BLUE = colors.HexColor('#eef3fc')
LIGHT_AMBER = colors.HexColor('#fff7e6')
LINE = colors.HexColor('#e5e7eb')

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm
CONTENT_W = PAGE_W - 2 * MARGIN

# ----------------------------------------------------------------------------- styles
BODY = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=14.5, textColor=colors.HexColor('#1f2937'), spaceAfter=6)
LEAD = ParagraphStyle('Lead', parent=BODY, fontSize=11, leading=16, textColor=colors.HexColor('#374151'), spaceAfter=10)
H1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=19, leading=23, textColor=BLUE, spaceBefore=4, spaceAfter=12)
H2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=ANTHRACITE, spaceBefore=12, spaceAfter=6, keepWithNext=1)
CAPTION = ParagraphStyle('Caption', fontName='Helvetica-Oblique', fontSize=8.5, leading=11, textColor=GREY, spaceBefore=3, spaceAfter=10)
BOX = ParagraphStyle('Box', parent=BODY, fontSize=9.5, leading=13.5, spaceAfter=0)
CELL = ParagraphStyle('Cell', parent=BODY, fontSize=9.3, leading=12.5, spaceAfter=0)
CELL_B = ParagraphStyle('CellB', parent=CELL, fontName='Helvetica-Bold')
TOC_TITLE = ParagraphStyle('TocTitle', parent=H1)
TOC_1 = ParagraphStyle('Toc1', fontName='Helvetica', fontSize=10.5, leading=19, textColor=ANTHRACITE)


# ----------------------------------------------------------------------------- briques
def p(text, style=BODY):
    return Paragraph(text, style)


def bullets(items):
    return ListFlowable(
        [ListItem(p(item), leftIndent=14, bulletColor=BLUE) for item in items],
        bulletType='bullet', start='•', bulletFontSize=9, leftIndent=14, bulletOffsetY=-1, spaceAfter=6,
    )


def steps(items):
    """Marche à suivre numérotée."""
    return ListFlowable(
        [ListItem(p(item), leftIndent=18) for item in items],
        bulletType='1', bulletFormat='%s.', bulletFontName='Helvetica-Bold', bulletColor=RED,
        bulletFontSize=10, leftIndent=18, spaceAfter=6,
    )


def box(title, text, background=LIGHT_BLUE, accent=BLUE):
    """Encadré Astuce / À savoir."""
    content = Paragraph(f'<font color="{accent.hexval()}"><b>{title}</b></font>&nbsp;&nbsp;{text}', BOX)
    table = Table([[content]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), background),
        ('LINEBEFORE', (0, 0), (0, -1), 2.5, accent),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return KeepTogether([table, Spacer(1, 8)])


def tip(text):
    return box('Astuce', text)


def note(text):
    return box('À savoir', text, LIGHT_AMBER, colors.HexColor('#b45309'))


def shot(name, caption, width=CONTENT_W, max_height=9.3 * cm):
    """Capture d'écran bordée + légende, gardées ensemble sur la page."""
    path = os.path.join(SHOTS, name)
    with PilImage.open(path) as image:
        ratio = image.height / image.width
    height = width * ratio
    if height > max_height:
        height, width = max_height, max_height / ratio
    picture = Image(path, width=width, height=height)
    frame = Table([[picture]], colWidths=[width + 2])
    frame.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.6, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 1), ('RIGHTPADDING', (0, 0), (-1, -1), 1),
        ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    frame.hAlign = 'LEFT'
    return KeepTogether([Spacer(1, 3), frame, p(caption, CAPTION)])


def grid(rows, widths, header=True):
    data = [[Paragraph(cell, CELL_B if (header and r == 0) else CELL) for cell in row] for r, row in enumerate(rows)]
    table = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ('GRID', (0, 0), (-1, -1), 0.4, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if header:
        style.append(('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE))
    table.setStyle(TableStyle(style))
    return KeepTogether([table, Spacer(1, 10)])


def chapter(title):
    return [PageBreak(), Paragraph(title, H1)]


# ----------------------------------------------------------------------------- capture annotée
def annotate(source, target, markers):
    """Pose des pastilles numérotées sur une capture (coordonnées en pixels de l'image)."""
    image = PilImage.open(os.path.join(SHOTS, source)).convert('RGB')
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype('arialbd.ttf', 30)
    except OSError:
        font = ImageFont.load_default()
    radius = 27
    for number, (x, y) in enumerate(markers, start=1):
        draw.ellipse([x - radius - 3, y - radius - 3, x + radius + 3, y + radius + 3], fill='white')
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill='#d32f2f')
        label = str(number)
        left, top, right, bottom = draw.textbbox((0, 0), label, font=font)
        draw.text((x - (right - left) / 2 - left, y - (bottom - top) / 2 - top), label, fill='white', font=font)
    image.save(os.path.join(SHOTS, target))


# ----------------------------------------------------------------------------- gabarits de page
class Manual(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'H1':
            text = flowable.getPlainText()
            key = f'ch-{self.seq.nextf("chapter")}'
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0)
            self.notify('TOCEntry', (0, text, self.page, key))


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ANTHRACITE)
    canvas.rect(0, PAGE_H - 11.5 * cm, PAGE_W, 11.5 * cm, stroke=0, fill=1)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 11.5 * cm - 4 * mm, PAGE_W, 4 * mm, stroke=0, fill=1)

    # Logo sur pastille blanche (le bleu du logo ressort mal sur l'anthracite à l'impression).
    with PilImage.open(LOGO) as logo:
        ratio = logo.height / logo.width
    logo_w = 6.2 * cm
    canvas.setFillColor(colors.white)
    canvas.roundRect(MARGIN - 4 * mm, PAGE_H - 4.6 * cm, logo_w + 8 * mm, logo_w * ratio + 8 * mm, 3 * mm, stroke=0, fill=1)
    canvas.drawImage(LOGO, MARGIN, PAGE_H - 4.6 * cm + 4 * mm, width=logo_w, height=logo_w * ratio, mask='auto')

    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 34)
    canvas.drawString(MARGIN, PAGE_H - 7.6 * cm, "Mode d'emploi")
    canvas.setFont('Helvetica', 17)
    canvas.drawString(MARGIN, PAGE_H - 8.7 * cm, 'StepBuild — Logiciel de gestion de chantier')
    canvas.setFillColor(colors.HexColor('#9ca3af'))
    canvas.setFont('Helvetica', 11)
    canvas.drawString(MARGIN, PAGE_H - 10.1 * cm, f'Version {VERSION}  ·  {DATE}')

    canvas.setFillColor(ANTHRACITE)
    canvas.setFont('Helvetica-Bold', 13)
    canvas.drawString(MARGIN, PAGE_H - 14 * cm, 'Lachat Construction Sàrl')
    canvas.setFont('Helvetica', 10.5)
    canvas.setFillColor(GREY)
    lines = [
        'Ce guide couvre les modules disponibles à ce jour : adresses, catalogue, éléments de coûts, projets,',
        "devis, demandes d'acompte, travaux exécutés, rapports journaliers, régie, rapport de régie, contrôle",
        'des heures et stocks. Il sera complété à chaque livraison.',
        '',
        "Les captures d'écran montrent des données d'exemple fictives.",
    ]
    for index, line in enumerate(lines):
        canvas.drawString(MARGIN, PAGE_H - 14.9 * cm - index * 15, line)

    canvas.setFillColor(GREY)
    canvas.setFont('Helvetica', 9.5)
    canvas.drawString(MARGIN, 2.2 * cm, 'Stéphane Offreda — Step One')
    canvas.restoreState()


def later(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BLUE)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - 1.35 * cm, PAGE_W - MARGIN, PAGE_H - 1.35 * cm)
    canvas.setFont('Helvetica', 8.5)
    canvas.setFillColor(GREY)
    canvas.drawString(MARGIN, PAGE_H - 1.15 * cm, "StepBuild — Mode d'emploi")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.15 * cm, 'Lachat Construction Sàrl')
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 1.5 * cm, PAGE_W - MARGIN, 1.5 * cm)
    canvas.drawString(MARGIN, 1.05 * cm, f'Version {VERSION} · {DATE} · Stéphane Offreda — Step One')
    canvas.drawRightString(PAGE_W - MARGIN, 1.05 * cm, f'Page {doc.page}')
    canvas.restoreState()


# ----------------------------------------------------------------------------- contenu
def build_story():
    # Pastilles de la vue d'ensemble : coordonnées sur la capture 2160 × 1290.
    annotate('12-devis-detail.png', '12-annotee.png', [
        (864, 37), (1700, 37), (1992, 107), (1549, 174), (330, 247), (1560, 307), (373, 373), (2068, 780), (700, 1267),
    ])

    s = [NextPageTemplate('later'), PageBreak()]

    toc = TableOfContents()
    toc.levelStyles = [TOC_1]
    toc.dotsMinLevel = 0
    s += [Paragraph('Sommaire', TOC_TITLE), toc]

    # ------------------------------------------------------------------ 1
    s += chapter('1. Avant de commencer')
    s += [
        p("StepBuild est une application web : il s'utilise dans un navigateur, sans rien "
          "installer. Il reprend votre façon de travailler avec BauBit (projets, devis, rapports, régie) dans une "
          "interface plus rapide.", LEAD),
        Paragraph('Ce dont vous avez besoin', H2),
        bullets([
            "Un navigateur récent : Chrome, Edge ou Firefox. Un écran d'au moins 1280 pixels de large est conseillé.",
            "L'adresse du logiciel et vos identifiants personnels, communiqués par votre administrateur.",
            'Une connexion internet.',
        ]),
        Paragraph('Trois rôles', H2),
        p("Chaque utilisateur a un rôle, qui détermine ce qu'il voit."),
        grid([
            ['Rôle', 'Accès'],
            ['Administrateur', "Tout le logiciel, y compris la gestion des utilisateurs et la configuration."],
            ['Responsable', "Projets, devis, rapports, régie, contrôle des heures, adresses, catalogue, éléments de coûts : "
                            "tout ce qui touche aux prix et aux marges."],
            ['Ouvrier', "Consultation des projets et saisie de ses rapports journaliers (heures, matériel, photos). "
                        "Il ne voit jamais les prix, les marges, les devis ni la régie."],
        ], [3.5 * cm, CONTENT_W - 3.5 * cm]),
        Paragraph("L'ordre de travail", H2),
        p("Le logiciel suit le déroulement d'un chantier :"),
        steps([
            "<b>Le projet</b> : vous créez le chantier, avec son client et son adresse.",
            "<b>Le devis</b> : juste après, vous choisissez les étapes du chantier à partir de modèles, puis vous chiffrez.",
            "<b>Les rapports journaliers</b> : les heures et le matériel se saisissent sur les étapes du devis.",
            "<b>La régie et le contrôle des heures</b> : chaque ligne de rapport reçoit son prix brut, son prix régie "
            "et son prix client ; les heures de chaque collaborateur se vérifient mois par mois.",
            "<b>Le rapport de régie</b> : étape par étape, ce que le devis prévoyait face à ce que les rapports ont "
            "coûté, en vert ou en rouge.",
            "<b>Les demandes d'acompte et les travaux exécutés</b> : deux documents tirés du devis. "
            "<b>La facture finale</b> arrive dans la prochaine livraison.",
        ]),
        note("Tout ce qui précède est disponible aujourd'hui, sauf la facture finale et les statistiques "
             "(voir le chapitre 16)."),
    ]

    # ------------------------------------------------------------------ 2
    s += chapter('2. Se connecter')
    s += [
        steps([
            "Ouvrez l'adresse du logiciel dans votre navigateur.",
            'Saisissez votre <b>email</b> et votre <b>mot de passe</b>, puis cliquez sur <b>Se connecter</b>.',
            "Vous arrivez sur la page d'accueil.",
        ]),
        shot('01-connexion.png', 'La page de connexion.', width=11 * cm),
        Paragraph('Mot de passe oublié', H2),
        p("Cliquez sur <b>Mot de passe oublié ?</b>, saisissez votre email : vous recevez un lien pour choisir un "
          "nouveau mot de passe."),
        Paragraph('Se déconnecter', H2),
        p("Cliquez sur l'icône de sortie, tout à droite de l'en-tête, à côté de votre nom. "
          "Pensez-y sur un poste partagé."),
        note("Après plusieurs tentatives infructueuses, la connexion est bloquée une minute. C'est une protection "
             "contre les essais de mots de passe."),
    ]

    # ------------------------------------------------------------------ 3
    s += chapter("3. L'écran en un coup d'œil")
    s += [
        p("Toutes les pages sont construites de la même façon. Une fois ces repères connus, vous vous retrouvez partout.", LEAD),
        shot('12-annotee.png', "Les neuf zones de l'écran, ici sur un devis."),
        grid([
            ['N°', 'Zone', 'À quoi elle sert'],
            ['1', 'Onglets du menu', "Les grandes familles : Accueil, Offre facturation, Exécution, Rapport de régie, Statistiques, Données de base, Administration."],
            ['2', 'Recherche', 'Retrouve un projet, un devis, une adresse, un article ou un prix (chapitre 4).'],
            ['3', "Barre d'actions", "Les fonctions de l'onglet choisi. Le bouton rouge est la fonction principale. Les fonctions grisées arrivent plus tard."],
            ['4', 'Projet et document courants', "Le chantier sur lequel vous travaillez. Un clic sur le champ ouvre une fenêtre de choix avec recherche et filtres. Les pages s'y rattachent automatiquement."],
            ['5', 'Onglets ouverts', "Chaque page visitée reste ouverte ici. Cliquez pour y revenir, sur la croix pour la fermer."],
            ['6', "Barre d'outils", 'Nouveau, annuler, supprimer, et les outils propres à la page. Pas de bouton Enregistrer : tout est automatique.'],
            ['7', 'Panneau latéral', "Résumé, étapes ou arborescence selon la page. La punaise le masque pour gagner de la place."],
            ['8', 'Zone de travail', 'La fiche en cours et, selon la page, la liste.'],
            ['9', "Barre d'état", "Nombre d'entrées, totaux (brut, régie, client, heures…), et l'état de l'enregistrement."],
        ], [1 * cm, 4.2 * cm, CONTENT_W - 5.2 * cm]),
        Paragraph("La page d'accueil", H2),
        p("Elle affiche le nombre de projets actifs par statut, le parcours d'un chantier, un accès direct à chaque "
          "module et l'avancement du développement."),
        shot('02-accueil.png', "La page d'accueil."),
    ]

    # ------------------------------------------------------------------ 4
    s += chapter('4. Les gestes communs à toutes les pages')
    s += [
        Paragraph("L'enregistrement est automatique", H2),
        p("Il n'y a aucun bouton « Enregistrer » : une fiche s'enregistre toute seule :"),
        bullets([
            'un peu plus d’une seconde après votre dernière frappe ;',
            'dès que vous quittez la fiche ;',
            'ou immédiatement avec <b>Ctrl + S</b>.',
        ]),
        p("La barre d'état, en bas à droite, indique <b>Modifications non enregistrées</b>, <b>Enregistrement…</b> puis "
          "<b>Enregistré</b>. Une <b>nouvelle</b> fiche est créée de la même façon, deux secondes après la dernière frappe, "
          "dès que ses champs obligatoires sont remplis ; vous continuez à la compléter sans rien faire de plus."),
        tip("La flèche courbe de la barre d'outils annule les modifications qui ne sont pas encore enregistrées."),
        Paragraph('Filtrer et trier une liste', H2),
        bullets([
            "Sous chaque titre de colonne, une case <b>Filtrer…</b> : tapez quelques lettres, la liste se réduit. "
            "Vous pouvez filtrer plusieurs colonnes à la fois.",
            "Cliquez sur un <b>titre de colonne</b> pour trier ; un second clic inverse le tri, un troisième l'annule.",
            "Tirez le <b>bord droit d'un titre de colonne</b> pour régler sa largeur ; un double-clic sur ce bord "
            "remet la largeur d'origine. Sur les listes de prix, vos largeurs sont mémorisées.",
            "Cliquez sur une <b>ligne</b> pour ouvrir sa fiche au-dessus de la liste.",
            'Les longues listes sont découpées en pages ; les flèches sont en bas à droite.',
        ]),
        Paragraph('Choisir le projet et le document', H2),
        p("La barre sombre sous le menu affiche le <b>projet courant</b> et le <b>document courant</b>. Un clic sur "
          "l'un des deux champs ouvre une fenêtre de choix : recherche instantanée, filtres par statut (et par type "
          "pour les documents), liste colorée. Un clic sur une ligne la choisit et referme la fenêtre."),
        shot('31-choix-projet.png', 'La fenêtre de choix du projet : recherche, statuts, « Seulement actifs ».', max_height=8 * cm),
        Paragraph('La recherche instantanée', H2),
        p("Cliquez dans le champ de recherche de l'en-tête, ou appuyez sur <b>Ctrl + K</b>. Les résultats s'affichent "
          "pendant la frappe, dès la deuxième lettre, classés par famille."),
        shot('03-recherche.png', "« carelage », tapé avec une faute, retrouve quand même les articles de carrelage.", width=11.5 * cm),
        bullets([
            "Les <b>accents</b> et les <b>majuscules</b> sont ignorés : « electricite » trouve « Électricité ».",
            "Les <b>fautes de frappe</b> sont tolérées : « echafodage » trouve « échafaudage ».",
            "Vous pouvez taper <b>plusieurs mots</b>, dans n'importe quel ordre : « dupont delemont ».",
            "Les flèches <b>haut</b> et <b>bas</b> parcourent les résultats, <b>Entrée</b> ouvre la fiche, <b>Échap</b> referme.",
            "La recherche est réservée aux administrateurs et aux responsables, car elle donne accès aux prix.",
        ]),
    ]

    # ------------------------------------------------------------------ 5
    s += chapter("5. Les clients (carnet d'adresses)")
    s += [
        p("Menu <b>Données de base</b>, bouton <b>Clients</b>. C'est votre carnet d'adresses unique : clients, "
          "fournisseurs, sous-traitants et contacts. Une adresse saisie ici se réutilise dans les projets et les devis.", LEAD),
        shot('04-adresses.png', 'Le carnet : la fiche en haut, la liste en bas, un résumé à gauche.', max_height=8 * cm),
        Paragraph('Créer une adresse', H2),
        steps([
            'Cliquez sur le bouton rouge <b>Nouvelle adresse</b>.',
            "Choisissez le <b>type</b> : client, fournisseur, sous-traitant ou contact.",
            "Saisissez le <b>nom</b> (ou la raison sociale), seul champ obligatoire, puis les coordonnées.",
            "Deux secondes plus tard, l'adresse est créée et apparaît dans la liste ; complétez-la tranquillement.",
        ]),
        shot('05-adresse-nouvelle.png', "Saisie d'une nouvelle adresse.", width=15 * cm),
        Paragraph('Retrouver, modifier, supprimer', H2),
        bullets([
            "Le menu déroulant <b>Tous les types</b> limite la liste à une famille.",
            "<b>Seulement actifs</b> masque les adresses que vous n'utilisez plus. Décochez <b>Actif</b> sur une fiche "
            "plutôt que de la supprimer : l'historique des projets reste intact.",
            "La corbeille supprime l'adresse après confirmation.",
        ]),
    ]

    # ------------------------------------------------------------------ 6
    s += chapter("6. Le catalogue d'articles et les modèles d'étapes")
    s += [
        p("Menu <b>Données de base</b>, bouton <b>Catalogue d'articles</b>. Le catalogue range vos articles par "
          "<b>chapitre</b>, c'est-à-dire par corps de métier : démontage, carrelage, sous-traitants…", LEAD),
        box('Important', "Chaque chapitre sert de <b>modèle d'étape</b>. Quand vous l'ajoutez à un devis, l'étape est "
            "créée avec tous ses articles et leurs prix. Un catalogue bien tenu, c'est un devis vite fait.",
            LIGHT_BLUE, BLUE),
        shot('06-catalogue.png', 'Les chapitres à gauche, les articles du chapitre choisi à droite.'),
        Paragraph('Gérer les chapitres', H2),
        bullets([
            "Cliquez sur un chapitre pour n'afficher que ses articles. <b>Tous les chapitres</b> affiche tout.",
            "Sous l'arborescence, <b>Nouveau chapitre</b> : saisissez un code et un libellé, puis <b>Ajouter</b>. "
            "Cochez « Sous-chapitre de… » pour le ranger sous le chapitre sélectionné.",
            "<b>Modifier</b> renomme le chapitre sélectionné. Un chapitre ne peut être supprimé que s'il est vide.",
        ]),
        Paragraph('Gérer les articles', H2),
        steps([
            "Sélectionnez le chapitre, puis cliquez sur <b>Nouvel article</b>.",
            "Saisissez le <b>code</b>, la <b>description</b> (obligatoire), l'<b>unité</b>, le <b>prix d'achat</b> et le <b>prix de vente</b>.",
            "Cochez <b>Titre de chapitre</b> pour une ligne de titre sans prix.",
        ]),
        tip("Les prix se saisissent comme vous en avez l'habitude : 1'250.50, 1250,5 ou 1250.50 sont tous compris."),
        note("Le prix d'achat sert au calcul de la marge dans les devis. Sans prix d'achat, la position est ignorée "
             "dans ce calcul."),
    ]

    # ------------------------------------------------------------------ 7
    s += chapter('7. Les éléments de coûts')
    s += [
        p("Menu <b>Données de base</b>, bouton <b>Eléments de coûts</b>. Ce sont vos listes de prix : ce que vous "
          "coûtent la main-d'œuvre, les matériaux, les machines, l'outillage et les tiers.", LEAD),
        shot('07-elements-couts.png', 'Les six familles en onglets, les groupes à gauche.'),
        grid([
            ['Famille', 'Contenu'],
            ['1 - Salaire', 'Tarifs horaires par fonction : ouvrier qualifié, chef d’équipe, apprenti…'],
            ['2 - Matériaux', "Produits et matériaux, avec prix d'achat et prix de vente."],
            ['3 - Machines/Engins', 'Mini-pelle, dumper, nacelle…'],
            ['4 - Matériaux exploitation', 'Consommables : carburant…'],
            ['5 - Outillage', 'Outils facturés à la journée.'],
            ['6 - Tiers', 'Sous-traitants.'],
        ], [4.6 * cm, CONTENT_W - 4.6 * cm]),
        Paragraph('Les trois niveaux de prix', H2),
        bullets([
            "<b>Prix d'achat</b> : ce que l'élément vous coûte (le prix net BauBit).",
            "<b>Prix de vente</b> : le prix majoré, facturé au client (le prix régie BauBit). La colonne <b>Majoration</b> "
            "montre l'écart en pour cent.",
        ]),
        Paragraph('Régler la majoration avec la tirette', H2),
        p("Dans la liste, cliquez sur la colonne <b>Majoration</b> d'un élément : une tirette s'ouvre. Déplacez-la, tapez "
          "le pour cent ou cliquez un raccourci (0, 10, 20, 30, 50 %) : le <b>prix de vente</b> est recalculé, prix d'achat "
          "+ majoration arrondi à 5 centimes, et enregistré dès que vous relâchez la tirette."),
        shot('40-majoration.png', 'La tirette de majoration : le prix de vente suit en direct.', width=11 * cm),
        p("Pour créer un élément, cliquez sur <b>Nouvel élément</b> : la famille de l'onglet ouvert et le groupe "
          "sélectionné sont déjà proposés. Le <b>code régie</b>, repris de BauBit, reste visible dans la fiche : il sert "
          "aux reprises de données."),
    ]

    # ------------------------------------------------------------------ 8
    s += chapter('8. Les projets')
    s += [
        p("Menu <b>Offre facturation</b>, bouton <b>Projets</b>. Un projet représente un chantier. Tout le reste "
          "s'y rattache : devis, rapports, régie, factures. La page montre la fiche du <b>projet courant</b> : pour "
          "en ouvrir un autre, choisissez-le dans la barre du haut ou par la recherche instantanée.", LEAD),
        shot('08-projets.png', 'La fiche du projet courant : onglets Général, Client, Adresses et Photos ; résumé à gauche.'),
        Paragraph('Créer un projet', H2),
        steps([
            'Cliquez sur <b>Nouveau projet</b>.',
            "Saisissez d'abord le <b>code postal</b> et la <b>localité</b> du chantier. Si le carnet d'adresses connaît "
            "ce NPA, la localité est proposée. Le <b>numéro de projet</b> apparaît aussitôt : NPA du chantier, puis "
            "numéro d'ordre. Après 2854-002 vient 2854-003.",
            "Cliquez sur <b>Continuer</b> : la fiche complète s'ouvre, le curseur sur la <b>désignation</b>. Décrivez "
            "les travaux, par exemple « Muller Hans - Rénovation cuisine ». Le numéro reste modifiable ; "
            "<b>Proposer</b> le recalcule.",
            "Onglet <b>Client</b> : choisissez le client dans le carnet. Ses coordonnées s'affichent, et un lien ouvre "
            "sa fiche. Pour un nouveau projet, son adresse remplit celle du chantier si elle est encore vide.",
            "Le projet est créé automatiquement et devient le <b>projet courant</b>, affiché dans la barre du haut.",
        ]),
        shot('09-projet-nouveau.png', "L'écran d'entrée d'un nouveau projet : le NPA 2854 propose la localité et le numéro 2854-003."),
        shot('39-projet-client.png', "L'onglet Client de la fiche : le client du carnet et ses coordonnées."),
        Paragraph('Les statuts', H2),
        grid([
            ['Statut', 'Signification', 'Couleur dans la liste'],
            ['En cours', 'Offre en préparation ou en attente de réponse.', 'Blanc'],
            ['Adjugé', 'Le client a confirmé, le chantier est à faire ou en route.', 'Vert'],
            ['Terminé', 'Chantier achevé.', 'Gris clair'],
            ['Refusé', "L'offre n'a pas été retenue.", 'Gris foncé'],
        ], [2.8 * cm, 9.2 * cm, CONTENT_W - 12 * cm]),
        p("Dans la fenêtre de choix du projet, les pastilles filtrent par statut et la case <b>Seulement actifs</b> "
          "masque les projets terminés depuis longtemps ou refusés que vous avez désactivés."),
        Paragraph('Les adresses du projet', H2),
        p("Onglet <b>Adresses</b>. En plus de l'adresse du chantier, un projet peut avoir autant d'adresses que "
          "nécessaire, chacune avec son <b>rôle</b> : facturation, architecte, direction des travaux, accès…"),
        shot('10-projet-adresses.png', "L'onglet Adresses d'un projet."),
        steps([
            'Cliquez sur <b>Ajouter une adresse</b> et indiquez son rôle.',
            "Choisissez une adresse <b>depuis le carnet</b> : ses coordonnées sont recopiées. Vous pouvez les adapter "
            "pour ce projet sans modifier le carnet. Ou saisissez-la librement.",
            'Cliquez sur <b>Ajouter</b>.',
        ]),
        Paragraph('Les photos', H2),
        p("Onglet <b>Photos</b>. Cliquez sur <b>Ajouter des photos</b> ou glissez les fichiers dans la zone. "
          "Formats JPG, PNG ou WebP, 10 Mo par photo au maximum, jusqu'à 12 photos par envoi."),
        shot('11-projet-photos.png', "La zone d'envoi des photos.", width=13.5 * cm),
        bullets([
            "Saisissez une <b>légende</b> sous la photo ; elle s'enregistre quand vous quittez le champ.",
            "<b>Mettre en couverture</b> place la photo en tête : elle s'affiche dans le panneau de gauche.",
            'Un clic sur une photo l’ouvre en grand dans un nouvel onglet.',
        ]),
        note("Les photos sont privées. Elles ne sont visibles que par les utilisateurs connectés."),
    ]

    # ------------------------------------------------------------------ 9
    s += chapter('9. Les devis')
    s += [
        p("Le devis se crée juste après le projet. Il fixe les <b>étapes du chantier</b> : les rapports journaliers, "
          "la régie et la facture s'y rattacheront. C'est la principale différence avec BauBit.", LEAD),
        Paragraph('Créer le devis', H2),
        steps([
            "Depuis la fiche du projet, dans le panneau de gauche, cliquez sur <b>Créer le devis</b> : le modèle de "
            "devis par défaut est appliqué. Ou, dans la page Documents, sur <b>Nouveau devis</b> : vous choisissez le "
            "modèle, ou un devis vide.",
            "Le devis reçoit son numéro : <b>numéro de projet - DE . numéro d'ordre</b>, par exemple 2800-001-DE.1.",
            'Le destinataire est repris du client du projet.',
        ]),
        Paragraph('Les modèles de devis', H2),
        p("Menu <b>Offre facturation</b>, bouton <b>Modèles de devis</b>. Un modèle rassemble les étapes générales d'un "
          "type de chantier, dans l'ordre : par exemple architecture, installation de chantier, démontage, carrelage, "
          "sous-traitants, divers. Cochez <b>Modèle par défaut</b> pour qu'il s'applique à chaque nouveau devis."),
        bullets([
            "Ajoutez une étape depuis un <b>chapitre du catalogue</b>, avec ou sans ses articles, ou une <b>étape libre</b>.",
            "Réordonnez les étapes avec la poignée. Le modèle s'enregistre tout seul dès qu'il a un nom.",
            "Dans un devis, <b>Appliquer un modèle de devis</b> (panneau de gauche) ajoute les étapes manquantes.",
            "Le bouton <b>Enregistrer comme modèle</b>, dans la barre d'outils du devis, crée un modèle à partir des "
            "étapes du devis ouvert.",
        ]),
        shot('12-devis-detail.png', "Un devis : le catalogue de prix et les étapes à gauche, le détail chiffré à droite."),
        Paragraph('Le panneau de gauche : catalogue et étapes', H2),
        p("Le panneau de gauche a deux volets dépliables. En haut, le <b>Catalogue de prix</b> : vos chapitres et leurs "
          "articles, avec une recherche. En dessous, <b>Étapes et devis</b>, replié par défaut : les documents du projet "
          "et les étapes du devis ouvert, pour y naviguer, appliquer un modèle de devis ou ajouter une étape depuis un chapitre."),
        shot('14-devis-etapes.png', 'Le catalogue de prix, chapitre Démontage déplié, et les étapes du devis en dessous.', width=6.6 * cm, max_height=13 * cm),
        Paragraph('Ajouter par glisser-déposer', H2),
        p("Depuis le catalogue, tout se fait en <b>glissant</b> vers la feuille, jamais en cliquant, pour éviter les "
          "ajouts involontaires :"),
        bullets([
            "Glissez un <b>chapitre</b> sur la feuille : son étape est ajoutée au devis, titre seul.",
            "Glissez un <b>article</b> : il va toujours dans l'étape de son chapitre. Si elle n'est pas encore dans le "
            "devis, elle est créée au passage. Déposé sur une ligne de cette étape, il prend sa place ; déposé ailleurs, "
            "il se met en fin d'étape. Un article de terrassement ne peut pas atterrir dans les sous-traitants.",
            "<b>Plusieurs à la fois</b> : cliquez un article, puis <b>Ctrl + clic</b> pour en ajouter d'autres (ou des "
            "chapitres) et <b>Maj + clic</b> pour une plage ; glissez l'un d'eux, toute la sélection suit, dans l'ordre du "
            "catalogue. Échap vide la sélection.",
            "Le crayon, au survol d'un article, ouvre une fenêtre pour le <b>modifier dans le catalogue</b>. Les lignes "
            "déjà dans les devis ne changent pas.",
            "Le <b>+</b>, au survol d'un chapitre, crée un <b>nouvel article</b> dans ce chapitre : description, code, "
            "unité, prix d'achat et prix de vente. Il rejoint le catalogue et se glisse ensuite sur le devis.",
            "Une coche sur un chapitre signale que son étape est déjà dans le devis.",
        ]),
        shot('42-catalogue-ajout.png', "Le + d'un chapitre : un nouvel article, directement depuis le devis.", width=10 * cm),
        Paragraph('Gérer les étapes sur la feuille', H2),
        bullets([
            "Chaque titre d'étape a sa <b>poignée</b> à gauche : glissez l'étape entière, avec ses positions, au-dessus "
            "ou en dessous d'une autre. Au clavier, cliquez la poignée puis flèches haut et bas.",
            "Un <b>double-clic</b> sur le titre, ou le crayon au survol, renomme l'étape ; la corbeille la supprime "
            "avec ses positions, après confirmation.",
            "Dans le volet <b>Étapes et devis</b>, un clic sur une étape fait défiler la feuille jusqu'à elle ; "
            "<b>Ajouter une étape depuis un chapitre</b> reprend un chapitre avec ou sans ses articles, et "
            "<b>étape libre</b> en crée une à votre nom.",
        ]),
        Paragraph('Chiffrer les positions', H2),
        p("Les articles arrivent du catalogue, par glisser-déposer. Une fois la ligne sur la feuille, tout se fait "
          "au clavier :"),
        steps([
            "L'article déposé arrive avec son unité et son prix ; le curseur se place sur la <b>quantité</b>.",
            "Saisissez la quantité, <b>Entrée</b> : le curseur passe sur le <b>prix</b>, déjà rempli. Corrigez-le si besoin.",
            "<b>Entrée</b> à nouveau : la ligne est enregistrée, passez à la suivante.",
        ]),
        Paragraph('Insérer un titre, un sous-titre ou un texte', H2),
        p("Au survol d'une ligne, un <b>+</b> apparaît sur son bord supérieur, à gauche (aussi en fin d'étape). Il ouvre "
          "une ligne d'insertion à cet endroit :"),
        bullets([
            "<b>Titre de chapitre</b> : un nouveau chapitre numéroté, comme une étape ; les lignes en dessous passent sous "
            "ce titre. Pratique pour couper une étape en deux (« Salle de bain de l'étage »).",
            "<b>Sous-titre</b> : en gras, il ouvre un sous-groupe numéroté (6.1, puis 6.1.1, 6.1.2…).",
            "<b>Texte</b> : en italique, sans prix ni numéro.",
        ]),
        shot('13-devis-insertion.png', "La ligne d'insertion ouverte par le + : titre de chapitre, sous-titre ou texte, puis Entrée."),
        Paragraph('Modifier une position', H2),
        bullets([
            "Cliquez dans une cellule et modifiez : description, unité, quantité, prix. Le <b>montant</b> se "
            "recalcule aussitôt, les totaux un instant après.",
            "L'<b>unité</b> se choisit en tapant ses premières lettres (« m2 », « pce », « jo ») : la liste, par ordre "
            "alphabétique, se filtre aussitôt ; Entrée prend l'unité et passe à la quantité.",
            "La case <b>Opt.</b> marque une <b>option</b> : son prix et son montant passent <b>entre parenthèses</b>, elle "
            "reste imprimée mais ne compte pas dans le total.",
            "Pour déplacer une ligne, saisissez la <b>poignée</b> (les six points à gauche) et glissez-la à sa nouvelle place, "
            "dans la même étape ou dans une autre. Un trait bleu indique où elle sera déposée. Au clavier : cliquez la poignée, "
            "puis flèches haut et bas.",
            "Au survol de la ligne, la corbeille la supprime.",
        ]),
        note("Les positions s'enregistrent toutes seules quand vous quittez la ligne. La barre d'état, en bas, "
             "affiche en permanence le net et le TTC du devis."),
        Paragraph('La feuille et les lignes sans quantité', H2),
        bullets([
            "Le détail se présente <b>comme la feuille imprimée</b> : numéros, colonnes et retours à la ligne sont ceux "
            "du PDF. Le code du catalogue n'est plus affiché dans la ligne ; il apparaît au survol du numéro.",
            "Une étape créée depuis un modèle contient tous ses articles. Le bouton <b>– n sans quantité</b>, sur "
            "l'étape ou dans la barre d'outils, retire d'un coup les lignes que vous n'avez pas chiffrées. Une ligne "
            "sans quantité mais avec un prix (« Ouvrier qualifié H. 90.- ») est conservée et s'imprime.",
        ]),
        Paragraph('Le sous-détail de prix', H2),
        p("Il remplace les formules notées en remarque dans BauBit. Sur une ligne, cliquez sur l'icône "
          "<b>calculatrice</b>, à droite : une fenêtre détaille le prix par famille de coûts, main-d'œuvre, matériaux, "
          "machines, matériel d'exploitation, outillage et sous-traitants."),
        shot('21-devis-sous-detail.png', "La fenêtre du sous-détail : le calcul de la ligne à gauche, la bibliothèque des ouvrages à droite."),
        box('Important', "Le sous-détail chiffre <b>toute la ligne</b>. Son total, divisé par la quantité de la ligne, "
            "donne le <b>prix unitaire</b> : 1 000.- de sous-détail pour 10 m² font 100.- le m². Si la quantité change, "
            "le prix suit.", LIGHT_BLUE, BLUE),
        bullets([
            "Chaque ligne : quantité, <b>prix d'achat</b> et <b>prix de vente</b> unitaires, <b>marge</b> en pour cent ; "
            "le coût et la vente de la ligne en découlent. Saisissez l'un des trois, les deux autres suivent : un prix de "
            "vente donne la marge, une marge donne le prix de vente. Une ligne <b>× Qté</b> se multiplie par la quantité "
            "de la position (4,2 kg de colle par m²) ; le <b>conditionnement</b> arrondit au sac ou à la pièce entière.",
            "Une ligne prise dans la <b>liste des éléments de coûts</b> (champ « Ajouter… », ou l'étiquette au survol "
            "d'une ligne libre) porte une <b>pastille</b> avec le numéro de l'élément : son prix d'achat et son prix de "
            "vente sont ceux de la liste de prix, à jour, et ne se modifient pas ici. Un clic sur la pastille détache la ligne.",
            "Vous pouvez quand même corriger le <b>prix unitaire</b> ou le <b>montant</b> de la ligne à la main : un "
            "montant saisi donne le prix unitaire (montant ÷ quantité). Le prix passe alors en rouge dans la ligne et "
            "le sous-détail indique « corrigé à … » ; ce prix corrigé est conservé si la quantité change.",
            "Le coût du sous-détail alimente la marge de la récapitulation et le budget du rapport de régie.",
            "Conventions du métreur : main-d'œuvre vendue 750.- la personne-jour, 90.- l'heure ; fournitures +30 %.",
        ]),
        Paragraph('La bibliothèque des ouvrages', H2),
        p("À droite de la fenêtre, la bibliothèque des <b>sous-détails types</b> : les 110 ouvrages du métreur, rangés "
          "par corps de métier, et les vôtres. Un clic sur un ouvrage charge ses lignes dans la position (après "
          "confirmation si des lignes existent déjà) ; les lignes rattachées à un élément de coûts arrivent avec le "
          "prix du jour. La recherche filtre par mot."),
        bullets([
            "<b>Nouvel ouvrage</b>, en bas : choisissez le groupe (corps de métier), donnez un nom, <b>Créer</b> : les "
            "lignes saisies deviennent un ouvrage réutilisable, pour la quantité et l'unité de la ligne.",
            "Au survol d'un ouvrage, l'icône <b>enregistrer</b> remplace ses lignes par celles saisies ici, et la "
            "<b>corbeille</b> le supprime de la bibliothèque.",
            "La page <b>Sous-détails types</b> (menu Offre facturation) permet de retravailler chaque ouvrage ; les "
            "lignes encore libres s'y rattachent à un élément de coûts par l'étiquette au survol.",
        ]),
        note("Les ouvrages du métreur ont été rattachés aux éléments de coûts quand c'était sûr (main-d'œuvre, "
             "machines, matériaux sans ambiguïté). Les autres lignes gardent leur prix d'origine jusqu'à ce que vous "
             "choisissiez l'élément."),
        Paragraph("Afficher les sous-détails, masquer les prix, totaux, saut de page", H2),
        p("Au-dessus de la feuille, trois cases : <b>Afficher les sous-détails</b> écrit les lignes du sous-détail en "
          "rouge, en tout petit, sous chaque position ; <b>Masquer les prix</b> donne un devis descriptif, sans prix ni "
          "montants ; <b>Totaux par étape</b>, cochée d'office, écrit le total de chaque étape sous ses lignes. Ces "
          "options s'appliquent aussi à l'aperçu et au PDF."),
        shot('33-devis-sous-details.png', 'Les sous-détails affichés en rouge sous les positions.', max_height=8 * cm),
        p("Le bouton à droite de la zone de dépôt de chaque étape insère un <b>saut de page</b> : il s'affiche en "
          "pointillé sur la feuille, se déplace par sa poignée comme une ligne, et coupe la page à l'impression."),
        Paragraph("L'en-tête du devis", H2),
        p("Onglet <b>En-tête</b> : objet, date, initiales, <b>statut</b> (en cours, envoyé, accepté, refusé), "
          "taux de <b>TVA</b>, <b>rabais</b> en pour cent, destinataire, texte d'introduction et conditions."),
        shot('15-devis-entete.png', "L'en-tête du devis, avec l'aperçu de l'adresse telle qu'elle s'imprime.", max_height=7.6 * cm),
        bullets([
            "Le destinataire a un champ <b>Entreprise</b> et une ligne <b>Complément</b> : choisissez la mention, "
            "<b>À l'attention de</b>, <b>p.a.</b>, <b>c/o</b> ou <b>Case postale</b>, et son texte. « À l'attention de » "
            "laissé sans texte vise la personne saisie : « À l'attention de Madame Marie Dupont ».",
            "L'adresse s'imprime dans l'ordre de La Poste : entreprise, titre, prénom et nom, complément, rue, case "
            "postale, NPA et localité. L'aperçu sous les champs la montre telle quelle.",
        ]),
        tip("Le destinataire est une copie de l'adresse au moment du devis. Vous pouvez l'adapter sans modifier le "
            "carnet, et un changement ultérieur dans le carnet ne modifie pas un devis déjà envoyé."),
        Paragraph('La récapitulation', H2),
        p("Onglet <b>Récapitulation</b> : total par étape, rabais, TVA, arrondi à 5 centimes et total TTC. "
          "L'encadré <b>Marge</b>, à usage interne, compare vos prix de vente à vos prix d'achat. Il passe en rouge "
          "sous 30 %. Les options sont listées à part."),
        shot('16-devis-recap.png', 'La récapitulation et la marge interne.', width=12.5 * cm),
        bullets([
            "Les <b>options</b> sont listées à part, avec leur <b>total</b> : il n'est pas compris dans le devis et s'ajoute si le client les retient. "
            "La page de garde du PDF le rappelle aussi, sous le total TTC.",
        ]),
        Paragraph("L'aperçu et le PDF", H2),
        p("Onglet <b>Aperçu</b>, ou l'imprimante de la barre d'outils. Le devis est mis en page comme vos devis "
          "actuels : page de garde avec le logo, le destinataire, « Bassecourt, le … », la récapitulation par étape, "
          "la TVA, les conditions de paiement et la signature du donneur d'ordre ; puis le détail des positions, "
          "numéroté en continu."),
        shot('20-devis-apercu.png', "L'aperçu du devis, tel qu'il sera imprimé.", max_height=9 * cm),
        bullets([
            "Le bouton <b>Télécharger</b> enregistre le PDF pour l'envoyer par email.",
            "Les cases <b>Imprimer les sous-détails</b> et <b>Sans les prix</b> reprennent les options de la feuille : "
            "sous-détails en rouge sous les positions, ou devis descriptif sans aucun prix. Les remarques internes "
            "ne sont jamais imprimées.",
            "Un devis <b>accepté</b> passe automatiquement le projet au statut <b>Adjugé</b>, et devient le devis "
            "de référence des rapports journaliers.",
        ]),
        Paragraph("La demande d'acompte", H2),
        p("Bouton <b>Autre document</b>, puis <b>Demande d'acompte</b>. Choisissez le devis de référence, puis un "
          "<b>pourcentage</b> du net HT (20, 30, 40, 50, 70, 100 % ou une valeur libre) ou un <b>montant fixe</b>. "
          "Le document AC.1 est créé avec une ligne, modifiable comme n'importe quel document. Son PDF rappelle le "
          "devis, les acomptes déjà demandés, la présente demande, la TVA et le montant à verser."),
        shot('34-acompte.png', "Création d'une demande d'acompte : 30 % du devis.", width=11 * cm),
        Paragraph('Les travaux exécutés', H2),
        p("Bouton <b>Autre document</b>, puis <b>Travaux exécutés</b>. Le document TE.1 reprend toutes les étapes et "
          "positions du devis. La <b>quantité du devis</b> reste affichée en gris ; la quantité <b>exécutée</b>, "
          "pré-remplie avec elle, se corrige position par position. La récapitulation et la page de garde du PDF "
          "comparent devis et exécuté par étape, avec le pourcentage."),
        shot('35-travaux-executes.png', 'Les travaux exécutés : la colonne « Qté devis » à côté de la quantité exécutée.', max_height=8 * cm),
        shot('36-travaux-recap.png', "La récapitulation : devis, exécuté et pourcentage par étape.", max_height=7 * cm),
        Paragraph('Nouvelle version, liste des documents', H2),
        bullets([
            "<b>Nouvelle version</b> copie le devis avec toutes ses étapes et positions : DE.1 devient DE.2. "
            "Utile quand le client demande une variante ; l'original reste intact.",
            "Sans devis ouvert (bouton <b>Explorateur documents</b> du menu, ou aucun projet choisi), la page liste "
            "tous les documents, tous projets confondus. Un clic ouvre le devis et sélectionne son projet.",
            "La corbeille supprime le document après confirmation.",
        ]),
    ]

    # ------------------------------------------------------------------ 10
    s += chapter('10. Les rapports journaliers')
    s += [
        p("Menu <b>Exécution</b>, bouton <b>Rapports journaliers</b>. Un rapport par jour et par chantier : qui a "
          "travaillé, combien d'heures, sur quelle étape du devis, avec quel matériel. C'est la source de la régie, du "
          "contrôle des heures et, bientôt, de la facture finale.", LEAD),
        box('Important', "Les heures se saisissent <b>sur les étapes du devis</b> du projet, et non sur une liste "
            "générale de types de travail comme dans BauBit. Créez le devis et ses étapes avant le premier rapport.",
            LIGHT_BLUE, BLUE),
        shot('22-rapports.png', "Les rapports du projet à gauche, colorés par statut ; l'en-tête et la grille des heures à droite."),
        Paragraph('Créer le rapport du jour', H2),
        steps([
            "Choisissez le <b>projet</b> dans la barre du haut.",
            "Cliquez sur <b>Nouveau rapport</b>. Il reçoit le numéro suivant (001, 002…), la date du jour et le "
            "devis accepté du projet (sinon le dernier devis). Vous êtes proposé comme responsable.",
            "Complétez l'en-tête : <b>date</b> (les chevrons changent de jour), <b>remarque</b> (travaux effectués), "
            "<b>météo</b> et températures, <b>responsable</b>. Tout s'enregistre automatiquement.",
            "Cochez <b>Régie</b> si le rapport est facturable en régie ; c'est le cas par défaut.",
        ]),
        Paragraph('La grille des heures', H2),
        p("Onglet <b>Salaire</b>. Une ligne par collaborateur présent, une colonne par étape du devis, puis les "
          "colonnes des types de travail : travail du samedi, repas, kilomètres, formation."),
        shot('23-rapport-heures.png', 'La grille des heures : 9 h de maçonnerie pour deux collaborateurs.', max_height=8 * cm),
        steps([
            "En bas de la grille, choisissez un collaborateur et cliquez sur <b>Ajouter</b>, ou reprenez d'un clic "
            "<b>l'équipe du rapport précédent</b>.",
            "Cliquez dans la cellule de l'étape et tapez les heures. <b>Entrée</b> descend à la ligne suivante, les "
            "<b>flèches</b> déplacent le curseur : un rapport se saisit sans souris.",
            "Chaque cellule s'enregistre quand vous la quittez. Une valeur à 0 l'efface ; le collaborateur reste dans le rapport.",
        ]),
        bullets([
            "Le <b>total des heures</b> d'un collaborateur ne compte que les étapes du devis et les types de travail "
            "en heures ; un repas ou des kilomètres ne sont pas des heures.",
            "Pour la gestion, la colonne <b>Base</b> rappelle le tarif horaire du collaborateur et <b>Montant</b> le "
            "coût de sa journée. L'ouvrier ne voit aucun de ces chiffres.",
            "La corbeille, au survol de la ligne, retire le collaborateur et ses heures.",
        ]),
        Paragraph('Matériaux, machines, outillage, tiers', H2),
        p("Les onglets <b>Matériaux</b>, <b>Machines</b>, <b>Mat. exploitation</b>, <b>Outillage</b> et <b>Tiers</b> "
          "reprennent les familles des éléments de coûts. Chaque ligne est rattachée à une étape du devis."),
        shot('24-rapport-materiaux.png', "Les matériaux d'un rapport : libellé, quantité, unité, coût ; prix repris des éléments de coûts.", max_height=7 * cm),
        bullets([
            "Tapez quelques lettres dans le champ d'ajout : les éléments de coûts de la famille apparaissent. "
            "<b>Entrée</b> reprend le libellé, l'unité et le prix net, et place le curseur sur la quantité.",
            "Sans résultat, Entrée crée une <b>ligne libre</b> avec votre texte, à compléter.",
            "Les lignes se modifient en place et s'enregistrent quand vous les quittez.",
        ]),
        Paragraph('Événements, fichiers et photos', H2),
        bullets([
            "<b>Evénements</b> : incidents, visites, livraisons, décisions prises sur le chantier.",
            "<b>Fichiers</b> et <b>Photos</b> : glissez les documents (plans, bons de livraison) et les photos du jour. "
            "Une légende peut être saisie sous chaque photo.",
        ]),
        Paragraph('Le cycle de validation', H2),
        grid([
            ['Statut', 'Signification', 'Couleur'],
            ['1-EC  En cours', "Le rapport se remplit. L'ouvrier peut encore le modifier.", 'Rouge'],
            ['2-CTRL  Contrôlé', "Transmis à la gestion, qui le vérifie et fixe les prix de régie. Seule la gestion le modifie.", 'Vert'],
            ['3-FAC  Facturé', 'Repris dans une facture : verrouillé.', 'Bleu'],
        ], [4 * cm, CONTENT_W - 6.4 * cm, 2.4 * cm]),
        bullets([
            "Le bouton <b>coche verte</b> de la barre d'outils passe le rapport au statut <b>Contrôlé</b>. La gestion peut "
            "revenir en arrière avec le champ Statut de l'en-tête.",
            "Les filtres du panneau de gauche limitent la liste à un <b>mois</b> ou à un <b>statut</b>. Les flèches "
            "de la barre d'outils passent d'un rapport à l'autre.",
        ]),
        Paragraph("Ce que voit l'ouvrier", H2),
        p("Un ouvrier connecté ne voit que <b>ses</b> rapports : ceux qu'il a créés, dont il est responsable ou dans "
          "lesquels il a des heures. Il saisit les heures de toute l'équipe, le matériel et les photos, puis transmet "
          "le rapport au contrôle. Il ne voit jamais un tarif ni un montant."),
        shot('30-ouvrier-rapport.png', "Le rapport vu par un ouvrier : ni colonne Base, ni Montant, ni total en francs.", max_height=7.6 * cm),
        tip("Pour qu'un ouvrier retrouve ses rapports, reliez son compte de connexion à sa fiche de collaborateur "
            "(chapitre 11). Il devient alors responsable par défaut des rapports qu'il crée."),
    ]

    # ------------------------------------------------------------------ 11
    s += chapter('11. Les collaborateurs et les types de travail')
    s += [
        p("Menu <b>Données de base</b>, bouton <b>Collaborateurs</b>. Chaque employé y a sa fiche : numéro, nom, "
          "tarif horaire et tarif régie. Seuls les collaborateurs <b>actifs</b> sont proposés dans les rapports.", LEAD),
        shot('25-collaborateurs.png', 'La fiche d’un collaborateur et, à droite, les types de travail de la grille des heures.'),
        Paragraph('Les deux tarifs', H2),
        bullets([
            "<b>Tarif horaire (coût)</b> : ce que l'heure coûte à l'entreprise. Il est copié dans chaque rapport au "
            "moment de la saisie : un changement de tarif ne modifie pas les rapports passés.",
            "<b>Position régie</b> : la fonction facturée au client, choisie parmi les éléments de coûts de la famille "
            "Salaire, par exemple « 010.010 Chef d'équipe 98.- ». Son prix régie devient le tarif régie du collaborateur.",
            "<b>Tarif régie propre</b> : à remplir seulement si ce collaborateur se facture à un autre prix que sa position.",
        ]),
        Paragraph('Le compte de connexion', H2),
        p("Un administrateur relie la fiche au compte de l'ouvrier (chapitre 15). Un compte ne peut être relié qu'à un "
          "seul collaborateur."),
        Paragraph('Les types de travail', H2),
        p("À droite de la fiche : les colonnes supplémentaires de la grille des heures. Modifiez un libellé ou une "
          "unité en place, décochez <b>Actif</b> pour retirer une colonne, ou ajoutez-en une en bas de la liste. "
          "Seules les unités en <b>heures</b> comptent dans les totaux, le coût et la régie ; un type déjà utilisé "
          "dans des rapports est désactivé plutôt que supprimé."),
    ]

    # ------------------------------------------------------------------ 12
    s += chapter('12. La régie : brut, régie, client')
    s += [
        p("Menu <b>Exécution</b>, bouton <b>Rapports régie</b> (ou <b>Lignes de régie</b> dans l'onglet Rapport de régie). "
          "La régie reprend chaque ligne des rapports journaliers "
          "du projet courant, heures et matériel, et lui donne <b>trois prix</b>, comme le rapport régie de BauBit.", LEAD),
        grid([
            ['Niveau', "D'où il vient", 'À quoi il sert'],
            ['Brut', "Le coût pour l'entreprise : tarif horaire du collaborateur, prix net de l'élément de coûts.", 'Le coût réel du chantier, la marge.'],
            ['Régie', "Le tarif majoré : position régie du collaborateur, prix régie de l'élément de coûts, ou coût brut "
                      "majoré de 30 % (réglable) quand l'élément n'a pas de prix régie.", 'Le prix de référence de votre tarif.'],
            ['Client', 'Égal au prix régie, tant que vous ne le changez pas.', 'Le prix qui sera facturé.'],
        ], [2 * cm, 9.8 * cm, CONTENT_W - 11.8 * cm]),
        shot('26-regie.png', "Les lignes de régie du projet, rapport par rapport, avec les trois prix et leurs montants."),
        Paragraph('Contrôler et corriger les prix', H2),
        steps([
            "Choisissez le <b>projet</b> dans la barre du haut. Les rapports marqués « Régie » apparaissent à gauche ; "
            "cliquez sur l'un d'eux pour ne voir que ses lignes, ou filtrez par statut, période ou collaborateur.",
            "Cliquez dans une cellule <b>Brut</b>, <b>Régie</b> ou <b>Client</b>, tapez le nouveau prix, puis "
            "<b>Entrée</b> ou quittez la cellule. Les montants et les totaux se recalculent aussitôt.",
            "Un prix client différent du prix régie s'affiche en <b>rouge</b>, pour le repérer d'un coup d'œil.",
        ]),
        bullets([
            "Tant que le prix client n'a pas été fixé à part, il <b>suit</b> le prix régie que vous modifiez.",
            "Les rapports <b>facturés</b> sont verrouillés : leurs prix ne se modifient plus.",
            "Le titre de chaque groupe ouvre le rapport journalier correspondant.",
            "Le bouton <b>flèches circulaires</b> de la barre d'outils réapplique les tarifs actuels à tous les rapports "
            "non facturés du projet, après une mise à jour des listes de prix par exemple. Les prix saisis à la main "
            "sont alors remplacés.",
        ]),
        Paragraph('La récapitulation', H2),
        shot('27-regie-recap.png', 'Les totaux par famille et par rapport, avec la marge sur le prix client.', max_height=7 * cm),
        p("L'onglet <b>Récapitulation</b> totalise les trois niveaux par famille (main-d'œuvre, matériaux, machines, "
          "outillage, sous-traitants) et par rapport. La <b>marge</b> compare le prix client au coût brut ; elle passe "
          "en rouge sous 30 %. La barre d'état affiche en permanence le brut, la régie, le client et les heures."),
        note("La majoration par défaut (30 %) et la durée d'une journée (9 h) se règlent dans <b>Administration, "
             "Configuration</b>. Un ouvrier n'accède ni à la régie ni à ces réglages."),
    ]

    # ------------------------------------------------------------------ 13
    s += chapter('13. Le rapport de régie : le devis face aux rapports')
    s += [
        p("Onglet <b>Rapport de régie</b> du menu, bouton <b>Rapport de régie</b>. Pour le projet courant, chaque "
          "étape du devis est mise en face de ce que les rapports journaliers ont consommé : les coûts sont-ils "
          "respectés ?", LEAD),
        shot('37-rapport-regie.png', "Le rapport de régie : une ligne par étape, verte dans le budget, rouge dépassée ; une étape dépliée sur ses rapports."),
        Paragraph('Lire le tableau', H2),
        grid([
            ['Colonne', 'Contenu'],
            ['Devis vente', 'Le prix de vente de l’étape dans le devis, options exclues.'],
            ['Prix de revient', "Le coût prévu : sous-détails de prix et prix d'achat des articles. Un tiret s'il n'y en a pas."],
            ['Heures prév. / réal.', "Les heures prévues (positions en heures, main-d'œuvre des sous-détails) et les heures des rapports."],
            ['Coût réalisé', 'Le coût brut des rapports : heures au tarif du collaborateur, plus les ressources au prix net.'],
            ['Écart, Consommé', "Budget moins coût réalisé, et la part du budget consommée. Le budget est le prix de revient s'il existe, sinon le prix de vente."],
            ['Régie, Client', 'Les montants régie et client des mêmes rapports : ce que vous pouvez facturer.'],
            ['Marge client', 'La marge du prix client sur le coût brut, réglable par la tirette (ci-dessous).'],
        ], [4 * cm, CONTENT_W - 4 * cm]),
        bullets([
            "<b>Vert</b> : le coût réalisé tient dans le budget. <b>Rouge</b> : dépassé, ou des dépenses sur une étape "
            "où rien n'était prévu. Gris : ni budget ni dépense.",
            "Un clic sur une étape la <b>déplie</b> sur les rapports journaliers qui l'ont alimentée ; un clic sur un "
            "rapport l'ouvre.",
            "Les heures sur les types de travail (samedi, formation…) et les lignes sans étape sont regroupées "
            "« hors devis ».",
            "Les pastilles filtrent par statut de rapport, les dates par période ; si le projet a plusieurs devis, "
            "choisissez la version à comparer. Le panneau de gauche résume tout le chantier.",
        ]),
        Paragraph('Régler la marge avec la tirette', H2),
        p("Sur chaque étape, et pour tout le chantier dans le panneau de gauche, une <b>tirette</b> fixe la marge du "
          "prix client sur le coût brut. Quand vous la relâchez, toutes les lignes de l'étape (heures et ressources, "
          "rapports non facturés) prennent le prix client « coût brut + marge », arrondi à 5 centimes. Le tarif régie "
          "de l'entreprise ne bouge pas. Les lignes des rapports facturés restent figées."),
        note("La marge affichée avant tout réglage reflète vos tarifs : un chef d'équipe facturé 98.- en régie pour un "
             "coût de 52.78 donne 86 %. Le prix client suit le tarif régie tant que vous n'y touchez pas."),
    ]

    # ------------------------------------------------------------------ 14
    s += chapter('14. Le contrôle des heures')
    s += [
        p("Menu <b>Exécution</b>, bouton <b>Contrôle des heures</b>. Pour chaque collaborateur, un tableau mensuel "
          "croise ses <b>chantiers</b> et les <b>jours</b> : les heures viennent des rapports journaliers, rien n'est "
          "à ressaisir.", LEAD),
        shot('28-controle-heures.png', "Le mois d'un collaborateur : en vert les jours contrôlés, en rouge ceux dont le rapport est encore en cours."),
        Paragraph('Lire le tableau', H2),
        bullets([
            "À gauche, les collaborateurs du mois avec leurs <b>heures</b>, leurs <b>absences</b> et le nombre de "
            "rapports <b>à valider</b>. Une ligne <b>ambre</b> signale des rapports encore en cours. Les chevrons et le "
            "champ <b>Mois</b> changent de mois ; le filtre <b>Heures à valider</b> ne garde que les cas à traiter.",
            "À droite, une ligne par chantier. La couleur d'une cellule est le <b>statut du rapport</b> du jour : rouge "
            "en cours, vert en contrôle, bleu facturé. Un clic sur une cellule <b>ouvre le rapport</b>.",
            "Les lignes du bas totalisent les heures de travail, les absences, le total du jour et le <b>total de la "
            "semaine</b>, affiché le dimanche. Un total journalier supérieur à la journée normale est signalé en rouge.",
        ]),
        Paragraph('Vacances et absences', H2),
        steps([
            "Cliquez sur un jour de la ligne <b>Vacances / absences</b>, ou sur le <b>calendrier</b> de la barre d'outils.",
            "Indiquez la période (<b>du … au …</b>), le <b>type</b> (vacances, maladie, accident, jour férié, école, "
            "service militaire, autre), les heures par jour, et une remarque si besoin.",
            "<b>Enregistrer</b>. Sur une période, seuls les jours ouvrés sont pris. Pour retirer une absence, "
            "rouvrez le jour et cliquez sur <b>Effacer l'absence</b>.",
        ]),
        shot('29-absence.png', "Saisie d'une absence : un jour ou une période.", width=11 * cm),
        Paragraph('Valider le mois', H2),
        p("La <b>coche verte</b> de la barre d'outils passe <b>en contrôle</b> tous les rapports du mois encore en "
          "cours où le collaborateur a des heures. Les cellules rouges deviennent vertes ; la gestion peut alors fixer "
          "les prix de régie. Un rapport validé ne peut plus être modifié par l'ouvrier."),
        note("Ces heures et absences alimenteront les synthèses annuelles par employé (heures par chantier et par mois, "
             "congés, maladie) de la prochaine livraison."),
    ]

    # ------------------------------------------------------------------ 15
    s += chapter('15. Utilisateurs, rôles et journal des connexions')
    s += [
        p("Menu <b>Administration</b>, réservé aux administrateurs.", LEAD),
        shot('18-utilisateurs.png', 'La gestion des utilisateurs.', width=14 * cm),
        bullets([
            "<b>Nouvel utilisateur</b> : nom, email, mot de passe d'au moins 8 caractères, et rôle.",
            "<b>Modifier</b> change le nom, l'email ou le rôle. Laissez le mot de passe vide pour le conserver.",
            "<b>Supprimer</b> retire l'accès. Vous ne pouvez pas supprimer votre propre compte.",
            "<b>Configuration</b> permet de changer le nom affiché et le logo de l'application, la majoration de "
            "régie par défaut et la durée d'une journée de travail.",
        ]),
        Paragraph("Ce que voit un ouvrier", H2),
        p("Un ouvrier consulte les projets pour retrouver son chantier, en lecture seule, et saisit ses rapports "
          "journaliers (chapitre 10). Il n'a ni recherche, ni devis, ni régie, ni adresses, ni prix."),
        shot('19-ouvrier.png', "La page Projets vue par un ouvrier : pas de bouton de création, fiche verrouillée.", max_height=7.6 * cm),
        note("Chaque création, modification et suppression est enregistrée dans un journal d'activité : qui a modifié "
             "quoi, et quand. Il est particulièrement utile pour les prix."),
        Paragraph('Le journal des connexions', H2),
        p("Menu <b>Administration</b>, bouton <b>Journal des connexions</b>. Chaque connexion réussie, chaque échec "
          "(email inconnu ou mauvais mot de passe), chaque blocage après six essais, chaque déconnexion et chaque "
          "mot de passe réinitialisé y est enregistré avec la date, l'utilisateur, l'email saisi, l'adresse IP et le "
          "navigateur. Les échecs ressortent en rouge ; le panneau de gauche résume les dernières 24 heures."),
        shot('38-connexions.png', 'Le journal des connexions, réservé aux administrateurs.', max_height=7.5 * cm),
        bullets([
            "Filtrez par type d'événement, par période ou par colonne. La liste se met à jour toute seule.",
            "Beaucoup d'échecs depuis une même adresse IP signalent une tentative d'intrusion.",
            "Le journal est conservé un an, puis purgé automatiquement.",
        ]),
    ]

    # ------------------------------------------------------------------ 16
    s += chapter('16. Les modules à venir')
    s += [
        p("Certaines pages et certains boutons sont déjà visibles mais pas encore actifs : ils sont grisés, ou "
          "signalent « disponible dans une phase ultérieure »."),
        grid([
            ['Module', 'Contenu prévu'],
            ['Facture finale et statistiques', "Facture finale depuis les rapports validés et les travaux exécutés (le statut « Facturé en régie » "
                                                "sera alors posé automatiquement) ; suivi de facturation et synthèses par employé."],
            ['Reprise des données BauBit', 'Vos projets, clients, catalogue et prix existants.'],
            ['Saisie mobile', 'Rapport journalier saisi sur le chantier, depuis un téléphone ou une tablette.'],
            ['Temps au bureau', 'Compteur de temps des employés de bureau. Les stocks sont déjà disponibles (Données de base, Stocks).'],
        ], [5 * cm, CONTENT_W - 5 * cm]),
        p("Ce mode d'emploi sera complété à chaque livraison."),
    ]

    # ------------------------------------------------------------------ 17
    s += chapter('17. Aide-mémoire')
    s += [
        Paragraph('Raccourcis clavier', H2),
        grid([
            ['Touche', 'Effet'],
            ['Ctrl + K', 'Place le curseur dans la recherche instantanée.'],
            ['Ctrl + S', 'Enregistre immédiatement la fiche en cours.'],
            ['Entrée (dans un devis)', "Dans l'unité : prend l'unité tapée ; puis passe de la quantité au prix, puis enregistre la ligne."],
            ['Entrée (grille des heures)', 'Enregistre la cellule et descend à la ligne suivante ; les flèches déplacent le curseur.'],
            ['Entrée (régie)', 'Enregistre le prix modifié ; Échap annule la saisie.'],
            ['Flèches haut et bas', "Parcourent les résultats d'une recherche."],
            ['Échap', 'Referme la liste de résultats.'],
            ['Tab', 'Passe au champ suivant.'],
        ], [4.6 * cm, CONTENT_W - 4.6 * cm]),
        Paragraph('Questions fréquentes', H2),
        grid([
            ['Question', 'Réponse'],
            ["Je ne trouve pas le bouton Enregistrer.", "Il n'est pas nécessaire : tout s'enregistre automatiquement. Vérifiez la mention « Enregistré » en bas à droite."],
            ['La liste est vide.', "Un filtre est probablement actif : videz les cases « Filtrer… », vérifiez le statut choisi et « Seulement actifs »."],
            ['Comment changer de projet ?', "Cliquez sur le champ Projet de la barre du haut : une fenêtre de choix s'ouvre, avec recherche et filtres. Ou Ctrl + K."],
            ["Je glisse un article dans une étape et il va ailleurs.", "Un article va toujours dans l'étape de son chapitre, créée si besoin. Une fois dans le devis, déplacez la ligne par sa poignée."],
            ['Le prix d’une ligne ne suit plus le sous-détail.', "Il a été corrigé à la main (il est en rouge). Rouvrez le sous-détail et modifiez une ligne : son prix est reporté à nouveau."],
            ['Je ne peux pas créer de devis.', 'Choisissez d’abord un projet dans la barre du haut. Les devis sont réservés aux responsables et administrateurs.'],
            ["Le numéro de projet proposé ne convient pas.", 'Modifiez-le à la main. Deux projets ne peuvent pas porter le même numéro.'],
            ["L'écran affiche « Cette page a rencontré une erreur ».", 'Cliquez sur Réessayer ou changez de page. Si cela se répète, notez ce que vous faisiez et contactez le support.'],
            ['Un article manque dans le devis.', "Dans le panneau de gauche, le + au survol de son chapitre le crée (description, unité, prix) ; glissez-le ensuite sur le devis."],
            ['La grille des heures est vide, sans colonnes.', "Le rapport n'est rattaché à aucun devis avec des étapes : créez le devis, ou choisissez-le dans le champ Devis de l'en-tête."],
            ['Un ouvrier ne voit pas ses rapports.', 'Reliez son compte de connexion à sa fiche de collaborateur (page Collaborateurs, administrateur).'],
            ['Le prix régie d’une ligne est vide.', "Le collaborateur n'a pas de position régie, ou l'élément de coûts n'a ni prix régie ni coût brut. Complétez la fiche, puis réappliquez les tarifs."],
            ['Je ne peux plus modifier un prix de régie.', 'Le rapport est facturé. Repassez-le « Contrôlé » depuis son en-tête si la facture n’est pas encore partie.'],
        ], [6 * cm, CONTENT_W - 6 * cm]),
        Paragraph('Support', H2),
        p("Pour toute question ou anomalie, contactez votre interlocuteur Step One. Précisez la page concernée, "
          "ce que vous cherchiez à faire et, si possible, joignez une capture d'écran."),
        Spacer(1, 14),
        p('Stéphane Offreda — Step One', ParagraphStyle('Sign', parent=BODY, fontName='Helvetica-Bold', alignment=TA_LEFT)),
    ]
    return s


def main():
    doc = Manual(
        OUTPUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=2.1 * cm, bottomMargin=2.1 * cm,
        title="Mode d'emploi — StepBuild",
        author='Stéphane Offreda — Step One', subject='Lachat Construction Sàrl',
    )
    frame = Frame(MARGIN, 2.1 * cm, CONTENT_W, PAGE_H - 4.2 * cm, id='main', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[frame], onPage=cover),
        PageTemplate(id='later', frames=[frame], onPage=later),
    ])
    doc.multiBuild(build_story())
    print('PDF :', os.path.normpath(OUTPUT))


if __name__ == '__main__':
    main()
