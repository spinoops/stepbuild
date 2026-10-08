# -*- coding: utf-8 -*-
"""
Génère le mode d'emploi PDF du logiciel de gestion de chantier.

    1. Lancer l'application (dev.bat), avec les données d'exemple.
    2. npm install ; npm run captures     -> docs/manuel/shots/*.png
    3. npm run pdf                         -> docs/Mode d'emploi - Logiciel de chantier.pdf

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
OUTPUT = os.path.join(HERE, '..', "Mode d'emploi - Logiciel de chantier.pdf")

VERSION = '0.3'
DATE = '8 octobre 2026'

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
    canvas.drawString(MARGIN, PAGE_H - 8.7 * cm, 'Logiciel de gestion de chantier')
    canvas.setFillColor(colors.HexColor('#9ca3af'))
    canvas.setFont('Helvetica', 11)
    canvas.drawString(MARGIN, PAGE_H - 10.1 * cm, f'Version {VERSION}  ·  {DATE}')

    canvas.setFillColor(ANTHRACITE)
    canvas.setFont('Helvetica-Bold', 13)
    canvas.drawString(MARGIN, PAGE_H - 14 * cm, 'Lachat Construction Sàrl')
    canvas.setFont('Helvetica', 10.5)
    canvas.setFillColor(GREY)
    lines = [
        'Ce guide couvre les modules disponibles à ce jour : adresses, catalogue, éléments de coûts,',
        "projets, devis, rapports journaliers, régie et contrôle des heures. Il sera complété à chaque livraison.",
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
    canvas.drawString(MARGIN, PAGE_H - 1.15 * cm, "Logiciel de gestion de chantier — Mode d'emploi")
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
        (1182, 37), (1274, 37), (1992, 107), (1549, 174), (330, 247), (1560, 307), (373, 373), (2068, 780), (700, 1267),
    ])

    s = [NextPageTemplate('later'), PageBreak()]

    toc = TableOfContents()
    toc.levelStyles = [TOC_1]
    toc.dotsMinLevel = 0
    s += [Paragraph('Sommaire', TOC_TITLE), toc]

    # ------------------------------------------------------------------ 1
    s += chapter('1. Avant de commencer')
    s += [
        p("Le logiciel de gestion de chantier est une application web : il s'utilise dans un navigateur, sans rien "
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
            "<b>La facture</b> : elle s'appuiera sur le devis et les rapports validés.",
        ]),
        note("Les étapes 1 à 4 sont disponibles aujourd'hui. Les acomptes, les factures et les statistiques arrivent "
             "dans la prochaine livraison (voir le chapitre 15)."),
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
            ['1', 'Onglets du menu', "Les grandes familles : Accueil, Offre facturation, Exécution, Services centraux, Données de base, Administration."],
            ['2', 'Recherche', 'Retrouve un projet, un devis, une adresse, un article ou un prix (chapitre 4).'],
            ['3', "Barre d'actions", "Les fonctions de l'onglet choisi. Le bouton rouge est la fonction principale. Les fonctions grisées arrivent plus tard."],
            ['4', 'Projet et document courants', "Le chantier sur lequel vous travaillez. Les pages s'y rattachent automatiquement."],
            ['5', 'Onglets ouverts', "Chaque page visitée reste ouverte ici. Cliquez pour y revenir, sur la croix pour la fermer."],
            ['6', "Barre d'outils", 'Nouveau, enregistrer, annuler, supprimer, et les outils propres à la page.'],
            ['7', 'Panneau latéral', "Résumé, étapes ou arborescence selon la page. La punaise le masque pour gagner de la place."],
            ['8', 'Zone de travail', 'La fiche en cours et la liste.'],
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
        p("Vous n'avez pas de bouton « Enregistrer » à ne pas oublier. Une fiche existante s'enregistre toute seule :"),
        bullets([
            'un peu plus d’une seconde après votre dernière frappe ;',
            'dès que vous quittez la fiche ;',
            'ou immédiatement avec <b>Ctrl + S</b>.',
        ]),
        p("La barre d'état, en bas à droite, indique <b>Modifications non enregistrées</b>, <b>Enregistrement…</b> puis "
          "<b>Enregistré</b>. Une <b>nouvelle</b> fiche est créée quand vous quittez le formulaire ou appuyez sur Ctrl + S, "
          "une fois les champs obligatoires remplis."),
        tip("La flèche courbe de la barre d'outils annule les modifications qui ne sont pas encore enregistrées."),
        Paragraph('Filtrer et trier une liste', H2),
        bullets([
            "Sous chaque titre de colonne, une case <b>Filtrer…</b> : tapez quelques lettres, la liste se réduit. "
            "Vous pouvez filtrer plusieurs colonnes à la fois.",
            "Cliquez sur un <b>titre de colonne</b> pour trier ; un second clic inverse le tri, un troisième l'annule.",
            "Cliquez sur une <b>ligne</b> pour ouvrir sa fiche au-dessus de la liste.",
            'Les longues listes sont découpées en pages ; les flèches sont en bas à droite.',
        ]),
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
    s += chapter('5. Les adresses')
    s += [
        p("Menu <b>Services centraux</b>, bouton <b>Adresses</b>. C'est votre carnet d'adresses unique : clients, "
          "fournisseurs, sous-traitants et contacts. Une adresse saisie ici se réutilise dans les projets et les devis.", LEAD),
        shot('04-adresses.png', 'Le carnet : la fiche en haut, la liste en bas, un résumé à gauche.', max_height=8 * cm),
        Paragraph('Créer une adresse', H2),
        steps([
            'Cliquez sur le bouton rouge <b>Nouvelle adresse</b>.',
            "Choisissez le <b>type</b> : client, fournisseur, sous-traitant ou contact.",
            "Saisissez le <b>nom</b> (ou la raison sociale), seul champ obligatoire, puis les coordonnées.",
            "Quittez le formulaire ou appuyez sur <b>Ctrl + S</b> : l'adresse est créée et apparaît dans la liste.",
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
            ['2 - Matériaux', 'Produits et matériaux, avec prix fournisseur et prix de revente.'],
            ['3 - Machines/Engins', 'Mini-pelle, dumper, nacelle…'],
            ['4 - Matériaux exploitation', 'Consommables : carburant…'],
            ['5 - Outillage', 'Outils facturés à la journée.'],
            ['6 - Tiers', 'Sous-traitants.'],
        ], [4.6 * cm, CONTENT_W - 4.6 * cm]),
        Paragraph('Les trois niveaux de prix', H2),
        bullets([
            "<b>Prix fournisseur</b> : ce que l'élément vous coûte, tarif brut.",
            "<b>Prix net</b> : après vos remises. S'il est laissé vide, il reprend le prix fournisseur.",
            "<b>Prix régie</b> : le prix majoré, facturé au client. La colonne <b>Majoration</b> calcule l'écart en pour cent.",
        ]),
        p("Pour créer un élément, cliquez sur <b>Nouvel élément</b> : la famille de l'onglet ouvert et le groupe "
          "sélectionné sont déjà proposés."),
    ]

    # ------------------------------------------------------------------ 8
    s += chapter('8. Les projets')
    s += [
        p("Menu <b>Offre facturation</b>, bouton <b>Projets</b>. Un projet représente un chantier. Tout le reste "
          "s'y rattache : devis, rapports, régie, factures.", LEAD),
        shot('08-projets.png', 'La fiche du projet en haut, la liste colorée par statut en bas.'),
        Paragraph('Créer un projet', H2),
        steps([
            'Cliquez sur <b>Nouveau projet</b>.',
            "Choisissez le <b>client</b>. Son nom est repris dans la <b>désignation</b> et son adresse devient "
            "l'adresse du chantier. Corrigez-la si le chantier est ailleurs.",
            "Le <b>numéro de projet</b> est proposé automatiquement : NPA du chantier, puis numéro d'ordre. "
            "Après 2854-002 vient 2854-003. Vous pouvez le modifier ; le bouton <b>Proposer</b> le recalcule.",
            'Complétez la désignation avec les travaux à réaliser, par exemple « Muller Hans - Rénovation cuisine ».',
            "Quittez le formulaire ou appuyez sur <b>Ctrl + S</b>. Le projet devient le <b>projet courant</b>, "
            "affiché dans la barre du haut.",
        ]),
        shot('09-projet-nouveau.png', 'Le client choisi a rempli la désignation, l’adresse et proposé le numéro 2854-003.'),
        Paragraph('Les statuts', H2),
        grid([
            ['Statut', 'Signification', 'Couleur dans la liste'],
            ['En cours', 'Offre en préparation ou en attente de réponse.', 'Blanc'],
            ['Adjugé', 'Le client a confirmé, le chantier est à faire ou en route.', 'Vert'],
            ['Terminé', 'Chantier achevé.', 'Gris clair'],
            ['Refusé', "L'offre n'a pas été retenue.", 'Gris foncé'],
        ], [2.8 * cm, 9.2 * cm, CONTENT_W - 12 * cm]),
        p("Les pastilles de la barre d'outils filtrent la liste par statut et affichent le nombre de projets de chacun. "
          "<b>Modèles</b> affiche les projets cochés « Modèle de projet », rangés à part."),
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
        p("Menu <b>Données de base</b>, bouton <b>Modèles de devis</b>. Un modèle rassemble les étapes générales d'un "
          "type de chantier, dans l'ordre : par exemple architecture, installation de chantier, démontage, carrelage, "
          "sous-traitants, divers. Cochez <b>Modèle par défaut</b> pour qu'il s'applique à chaque nouveau devis."),
        bullets([
            "Ajoutez une étape depuis un <b>chapitre du catalogue</b>, avec ou sans ses articles, ou une <b>étape libre</b>.",
            "Réordonnez les étapes avec la poignée. Enregistrez avec le bouton ou <b>Ctrl + S</b>.",
            "Dans un devis, <b>Appliquer un modèle de devis</b> (panneau de gauche) ajoute les étapes manquantes.",
            "Le bouton <b>Enregistrer comme modèle</b>, dans la barre d'outils du devis, crée un modèle à partir des "
            "étapes du devis ouvert.",
        ]),
        shot('12-devis-detail.png', "Un devis : ses étapes à gauche, le détail chiffré à droite."),
        Paragraph('Ajouter les étapes', H2),
        p("Dans le panneau de gauche, rubrique <b>Ajouter depuis un modèle</b> :"),
        steps([
            "Choisissez un <b>modèle d'étape</b>, c'est-à-dire un chapitre de votre catalogue.",
            "Laissez coché <b>Avec ses articles et leurs prix</b> pour récupérer toutes les positions du chapitre. "
            "Il ne vous restera que les quantités à saisir.",
            "Cliquez sur <b>Ajouter l'étape</b>. Une coche signale les modèles déjà utilisés.",
        ]),
        shot('14-devis-etapes.png', 'Le panneau des étapes : le modèle « Terrassement » est sélectionné.', width=6.2 * cm, max_height=12.5 * cm),
        bullets([
            "<b>Étape libre</b> : saisissez un code et un libellé, puis cliquez sur le +.",
            "Survolez une étape pour la <b>monter</b>, la <b>descendre</b>, la <b>renommer</b> ou la <b>supprimer</b> "
            "(ses positions sont supprimées avec elle).",
            "Un clic sur une étape fait défiler le détail jusqu'à elle. Son total est affiché à droite.",
        ]),
        Paragraph('Saisir les positions rapidement', H2),
        p("Sous chaque étape se trouve un champ <b>Ajouter une position</b>. Tout se fait au clavier :"),
        steps([
            "Tapez quelques lettres de l'article, ou son code. Les articles du catalogue apparaissent aussitôt, "
            "fautes de frappe comprises.",
            "<b>Entrée</b> insère l'article avec son unité et son prix. Le curseur se place sur la <b>quantité</b>.",
            "Saisissez la quantité, <b>Entrée</b> : le curseur passe sur le <b>prix</b>, déjà rempli. Corrigez-le si besoin.",
            "<b>Entrée</b> à nouveau : vous revenez au champ d'ajout, prêt pour la position suivante.",
        ]),
        shot('13-devis-saisie-rapide.png', "« bagete angle » retrouve la baguette d'angle. Les deux dernières lignes servent quand l'article n'existe pas."),
        Paragraph("Quand l'article n'existe pas", H2),
        bullets([
            "<b>Ajouter en ligne libre</b> : la position est créée avec votre texte, à chiffrer à la main.",
            "<b>Créer l'article dans le catalogue et l'ajouter</b> : l'article est créé dans le chapitre de l'étape, "
            "puis ajouté au devis, sans quitter la page. Pensez à compléter plus tard son unité et son prix dans le catalogue.",
        ]),
        Paragraph('Modifier une position', H2),
        bullets([
            "Cliquez dans une cellule et modifiez : code, description, unité, quantité, prix. Le <b>montant</b> se "
            "recalcule aussitôt, les totaux un instant après.",
            "La case <b>Opt.</b> marque une <b>option</b> : elle reste affichée mais ne compte pas dans le total.",
            "Pour déplacer une ligne, saisissez la <b>poignée</b> (les six points à gauche) et glissez-la à sa nouvelle place, "
            "dans la même étape ou dans une autre. Un trait bleu indique où elle sera déposée. Au clavier : cliquez la poignée, "
            "puis flèches haut et bas.",
            "Au survol de la ligne, la corbeille la supprime.",
        ]),
        note("Les positions s'enregistrent toutes seules quand vous quittez la ligne. La barre d'état, en bas, "
             "affiche en permanence le net et le TTC du devis."),
        Paragraph('Sous-titres, textes et lignes sans quantité', H2),
        bullets([
            "Le champ d'ajout propose aussi <b>Ajouter comme sous-titre</b> et <b>comme texte</b>. Un sous-titre ouvre "
            "un sous-groupe numéroté (6.1, puis 6.1.1, 6.1.2…) ; un texte s'imprime en italique, sans prix ni numéro.",
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
        shot('21-devis-sous-detail.png', "Le sous-détail d'une position : un sous-détail type a été chargé, les lignes restent modifiables.", max_height=9 * cm),
        bullets([
            "Chaque ligne : quantité, coût unitaire, majoration en pour cent ; le logiciel calcule le coût et le prix de "
            "vente. La quantité peut être <b>par unité de dimension</b> (m², ml…) et arrondie au <b>conditionnement</b>.",
            "<b>Charger un sous-détail type</b> reprend un ouvrage de votre bibliothèque (menu <b>Données de base</b>, "
            "bouton <b>Sous-détails types</b> : les 110 ouvrages du métreur y sont déjà). <b>Enregistrer comme "
            "sous-détail type</b> ajoute le vôtre à la bibliothèque.",
            "<b>Reporter le prix calculé</b> inscrit le prix de vente dans la position. Sinon le prix saisi à la main "
            "reste, et l'écart est signalé. Le coût alimente la marge de la récapitulation.",
            "Conventions du métreur : main-d'œuvre vendue 750.- la personne-jour, 90.- l'heure ; fournitures +30 %.",
        ]),
        Paragraph("L'en-tête du devis", H2),
        p("Onglet <b>En-tête</b> : objet, date, initiales, <b>statut</b> (en cours, envoyé, accepté, refusé), "
          "taux de <b>TVA</b>, <b>rabais</b> en pour cent, destinataire, texte d'introduction et conditions."),
        shot('15-devis-entete.png', "L'en-tête du devis.", max_height=7.6 * cm),
        tip("Le destinataire est une copie de l'adresse au moment du devis. Vous pouvez l'adapter sans modifier le "
            "carnet, et un changement ultérieur dans le carnet ne modifie pas un devis déjà envoyé."),
        Paragraph('La récapitulation', H2),
        p("Onglet <b>Récapitulation</b> : total par étape, rabais, TVA, arrondi à 5 centimes et total TTC. "
          "L'encadré <b>Marge</b>, à usage interne, compare vos prix de vente à vos prix d'achat. Il passe en rouge "
          "sous 30 %. Les options sont listées à part."),
        shot('16-devis-recap.png', 'La récapitulation et la marge interne.', width=12.5 * cm),
        Paragraph("L'aperçu et le PDF", H2),
        p("Onglet <b>Aperçu</b>, ou l'imprimante de la barre d'outils. Le devis est mis en page comme vos devis "
          "actuels : page de garde avec le logo, le destinataire, « Bassecourt, le … », la récapitulation par étape, "
          "la TVA, les conditions de paiement et la signature du donneur d'ordre ; puis le détail des positions, "
          "numéroté en continu."),
        shot('20-devis-apercu.png', "L'aperçu du devis, tel qu'il sera imprimé.", max_height=9 * cm),
        bullets([
            "Le bouton <b>Télécharger</b> enregistre le PDF pour l'envoyer par email.",
            "Les remarques internes et les sous-détails de prix ne sont jamais imprimés.",
            "Un devis <b>accepté</b> passe automatiquement le projet au statut <b>Adjugé</b>, et devient le devis "
            "de référence des rapports journaliers.",
        ]),
        Paragraph('Nouvelle version, explorateur', H2),
        bullets([
            "<b>Nouvelle version</b> copie le devis avec toutes ses étapes et positions : DE.1 devient DE.2. "
            "Utile quand le client demande une variante ; l'original reste intact.",
            "L'onglet <b>Explorateur</b> liste tous les documents, tous projets confondus. Un clic ouvre le devis "
            "et sélectionne son projet.",
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
            ['2-CTRL  En contrôle', "Transmis à la gestion, qui le vérifie et fixe les prix de régie. Seule la gestion le modifie.", 'Vert'],
            ['3-FAC  Facturé en régie', 'Repris dans une facture : verrouillé.', 'Bleu'],
        ], [4 * cm, CONTENT_W - 6.4 * cm, 2.4 * cm]),
        bullets([
            "Le bouton <b>coche verte</b> de la barre d'outils passe le rapport <b>en contrôle</b>. La gestion peut "
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
        p("Un administrateur relie la fiche au compte de l'ouvrier (chapitre 14). Un compte ne peut être relié qu'à un "
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
        p("Menu <b>Exécution</b>, bouton <b>Rapports régie</b>. La régie reprend chaque ligne des rapports journaliers "
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
    s += chapter('13. Le contrôle des heures')
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

    # ------------------------------------------------------------------ 14
    s += chapter('14. Utilisateurs et rôles')
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
    ]

    # ------------------------------------------------------------------ 15
    s += chapter('15. Les modules à venir')
    s += [
        p("Certaines pages et certains boutons sont déjà visibles mais pas encore actifs : ils sont grisés, ou "
          "signalent « disponible dans une phase ultérieure »."),
        grid([
            ['Module', 'Contenu prévu'],
            ['Factures et statistiques', "Acomptes, factures, facture finale depuis les rapports validés (le statut « Facturé en régie » "
                                         "sera alors posé automatiquement), impression PDF ; suivi de facturation et synthèses par employé."],
            ['Reprise des données BauBit', 'Vos projets, clients, catalogue et prix existants.'],
            ['Saisie mobile', 'Rapport journalier saisi sur le chantier, depuis un téléphone ou une tablette.'],
            ['Temps au bureau et stocks', 'Compteur de temps et gestion des stocks de produits.'],
        ], [5 * cm, CONTENT_W - 5 * cm]),
        p("Ce mode d'emploi sera complété à chaque livraison."),
    ]

    # ------------------------------------------------------------------ 16
    s += chapter('16. Aide-mémoire')
    s += [
        Paragraph('Raccourcis clavier', H2),
        grid([
            ['Touche', 'Effet'],
            ['Ctrl + K', 'Place le curseur dans la recherche instantanée.'],
            ['Ctrl + S', 'Enregistre immédiatement la fiche en cours.'],
            ['Entrée (dans un devis)', "Insère l'article choisi, puis passe de la quantité au prix, puis au champ d'ajout."],
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
            ['Je ne peux pas créer de devis.', 'Choisissez d’abord un projet dans la barre du haut. Les devis sont réservés aux responsables et administrateurs.'],
            ["Le numéro de projet proposé ne convient pas.", 'Modifiez-le à la main. Deux projets ne peuvent pas porter le même numéro.'],
            ["L'écran affiche « Cette page a rencontré une erreur ».", 'Cliquez sur Réessayer ou changez de page. Si cela se répète, notez ce que vous faisiez et contactez le support.'],
            ['Un article manque dans le devis.', "Créez-le à la volée depuis le champ d'ajout, puis complétez-le dans le catalogue."],
            ['La grille des heures est vide, sans colonnes.', "Le rapport n'est rattaché à aucun devis avec des étapes : créez le devis, ou choisissez-le dans le champ Devis de l'en-tête."],
            ['Un ouvrier ne voit pas ses rapports.', 'Reliez son compte de connexion à sa fiche de collaborateur (page Collaborateurs, administrateur).'],
            ['Le prix régie d’une ligne est vide.', "Le collaborateur n'a pas de position régie, ou l'élément de coûts n'a ni prix régie ni coût brut. Complétez la fiche, puis réappliquez les tarifs."],
            ['Je ne peux plus modifier un prix de régie.', 'Le rapport est facturé. Repassez-le « en contrôle » depuis son en-tête si la facture n’est pas encore partie.'],
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
        title="Mode d'emploi — Logiciel de gestion de chantier",
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
