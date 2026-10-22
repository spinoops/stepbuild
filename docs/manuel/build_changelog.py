# -*- coding: utf-8 -*-
"""
Génère le PDF des nouveautés livrées entre deux dates (document court pour le client).

    python build_changelog.py   -> docs/Nouveautés - StepBuild - 16 au 22 octobre 2026.pdf

Reprend la charte du mode d'emploi (build_manual.py). Police Helvetica : caractères WinAnsi seulement.
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer

from build_manual import (
    ANTHRACITE, BLUE, BODY, CONTENT_W, GREY, H1, H2, LEAD, MARGIN, PAGE_H, PAGE_W, RED, bullets, grid, note, p, tip,
)

HERE = os.path.dirname(os.path.abspath(__file__))
PERIOD = 'du 16 au 22 octobre 2026'
OUTPUT = os.path.join(HERE, '..', 'Nouveautés - StepBuild - 16 au 22 octobre 2026.pdf')


def header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ANTHRACITE)
    canvas.rect(0, PAGE_H - 2.6 * cm, PAGE_W, 2.6 * cm, stroke=0, fill=1)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 2.6 * cm - 2.5, PAGE_W, 2.5, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 15)
    canvas.drawString(MARGIN, PAGE_H - 1.65 * cm, 'StepBuild — Nouveautés')
    canvas.setFont('Helvetica', 10)
    canvas.setFillColor(colors.HexColor('#d1d5db'))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.65 * cm, f'Lachat Construction Sàrl  ·  {PERIOD}')
    canvas.setFillColor(GREY)
    canvas.setFont('Helvetica', 8.5)
    canvas.drawString(MARGIN, 1.05 * cm, 'Stéphane Offreda — Step One')
    canvas.drawRightString(PAGE_W - MARGIN, 1.05 * cm, f'Page {doc.page}')
    canvas.restoreState()


def story():
    s = [
        Spacer(1, 6),
        Paragraph(f'Nouveautés livrées {PERIOD}', H1),
        p("Ce document résume ce qui a changé dans StepBuild depuis vendredi 16 octobre après-midi, à la suite de vos "
          "retours. Tout est en ligne. Le mode d'emploi a été mis à jour en conséquence (version 0.4).", LEAD),

        Paragraph('1. Projets', H2),
        bullets([
            "<b>Nouveau projet</b> : on saisit d'abord le code postal et la localité du chantier, en grand. La localité "
            "est proposée si le carnet d'adresses connaît le NPA, et le numéro de projet (2854-003) apparaît aussitôt. "
            "« Continuer » ouvre la fiche complète.",
            "<b>Onglet Client</b> : le client et ses coordonnées ont quitté l'onglet Général pour un onglet à part, "
            "avec un lien vers sa fiche du carnet.",
            "<b>Plus de liste en bas de la page</b> : la fiche occupe toute la page. Le projet se choisit dans la barre "
            "du haut.",
        ]),

        Paragraph('2. Barre Projet / Document', H2),
        bullets([
            "Les deux champs ouvrent désormais une <b>fenêtre de choix</b> : recherche instantanée, filtres par statut "
            "(et par type pour les documents), liste colorée. Un clic sur une ligne la choisit et referme la fenêtre.",
        ]),

        Paragraph('3. Devis : panneau de gauche et saisie', H2),
        bullets([
            "Le panneau de gauche a deux volets : le <b>Catalogue de prix</b> en haut, <b>Étapes et devis</b> en dessous.",
            "Les articles et les chapitres s'ajoutent <b>uniquement en glissant</b> vers la feuille, jamais au clic.",
            "Un article glissé va <b>toujours dans l'étape de son chapitre</b>, créée au passage si elle manque. Déposé "
            "sur une ligne de cette étape, il prend sa place. Une fois dans le devis, la ligne se déplace librement.",
            "Un article du catalogue se <b>modifie dans une fenêtre</b> depuis le panneau (crayon). Les lignes déjà dans "
            "les devis ne changent pas.",
            "Les <b>étapes</b> se déplacent, se renomment (double-clic) et se suppriment directement sur la feuille, "
            "par leur poignée et les icônes au survol du titre.",
            "<b>Saut de page</b> : un bouton à droite du champ d'ajout insère un saut de page, déplaçable, respecté à l'impression.",
        ]),

        Paragraph('4. Devis : sous-détail de prix', H2),
        bullets([
            "Le sous-détail est toujours <b>le calcul complet de la ligne</b> : son total divisé par la quantité donne le "
            "prix unitaire (1 000.- pour 10 m² = 100.- le m²), et le prix suit si la quantité change.",
            "Le <b>prix unitaire</b> et le <b>montant</b> de la ligne restent corrigeables à la main : un total saisi "
            "donne le prix unitaire. Le sous-détail reste affiché en rouge, avec la mention « corrigé à … ».",
            "Deux options en haut du devis : <b>Afficher les sous-détails</b> (en rouge, en tout petit, sous chaque "
            "position) et <b>Masquer les prix</b>. Elles s'appliquent aussi à l'aperçu et au PDF.",
        ]),

        Paragraph('5. Devis : destinataire et nouveaux documents', H2),
        bullets([
            "Destinataire : champ <b>Entreprise</b> et ligne <b>Complément</b> avec la mention « À l'attention de », "
            "« p.a. », « c/o » ou « Case postale ». L'adresse s'imprime dans l'ordre de La Poste, avec un aperçu dans l'en-tête.",
            "<b>Demande d'acompte</b> (AC.1) : pourcentage du net HT ou montant fixe, PDF avec rappel du devis, des "
            "acomptes déjà demandés et du montant à verser.",
            "<b>Travaux exécutés</b> (TE.1) : les positions du devis avec la quantité du devis en gris et la quantité "
            "exécutée à corriger ; comparaison devis / exécuté par étape, avec le pourcentage, à l'écran et dans le PDF.",
        ]),

        Paragraph('6. Rapport de régie (nouvel onglet du menu)', H2),
        bullets([
            "Pour le projet courant, chaque <b>étape du devis</b> est mise en face des <b>rapports journaliers</b> : "
            "devis vente, prix de revient, heures prévues et réalisées, coût réalisé, écart, part du budget consommée, "
            "régie et client. <b>Vert</b> dans le budget, <b>rouge</b> dépassé.",
            "Chaque étape se déplie sur ses rapports ; filtres par statut, période et version du devis ; résumé du "
            "chantier dans le panneau de gauche.",
            "Une <b>tirette de marge</b> par étape, et une pour tout le chantier, fixe le prix client de toutes les "
            "lignes à « coût brut + marge » (rapports non facturés).",
        ]),

        Paragraph('7. Éléments de coûts et listes', H2),
        bullets([
            "La <b>majoration</b> se règle d'un clic dans la liste, avec une tirette : le prix régie est recalculé et enregistré.",
            "Les colonnes « Un. régie » et « Code régie » ont quitté la liste ; le code reste dans la fiche pour les reprises.",
            "Les colonnes « Prix du » et « Majoration » se trient. Dans toutes les grilles, les <b>colonnes se "
            "redimensionnent</b> en tirant le bord droit de leur titre.",
        ]),

        Paragraph('8. Menu et administration', H2),
        bullets([
            "Onglet <b>Rapport de régie</b> ajouté à côté d'Exécution ; <b>Services centraux</b> renommé <b>Statistiques</b>.",
            "<b>Données de base</b> regroupe désormais <b>Clients</b> (le carnet d'adresses, auparavant « Adresses » dans "
            "Services centraux), Catalogue d'articles, Stocks, Éléments de coûts et Collaborateurs. Les modèles de devis "
            "et les sous-détails types sont dans Offre facturation.",
            "L'onglet actif du menu se raccorde à la barre de boutons ; les boutons factices Colonnes, Filtre et "
            "Imprimer ont disparu des barres d'outils.",
            "<b>Journal des connexions</b> (Administration) : connexions, échecs, blocages, déconnexions et mots de "
            "passe réinitialisés, avec adresse IP et navigateur ; conservé un an.",
        ]),

        note("Le mode d'emploi, version 0.4 du 22 octobre 2026, décrit chacun de ces points avec des captures d'écran."),
        tip("Pour tout retour, signalez la page concernée et ce que vous cherchiez à faire : la prochaine livraison "
            "portera sur la facture finale."),
        Spacer(1, 10),
        p('Stéphane Offreda — Step One', BODY),
    ]
    return s


def main():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=3.3 * cm, bottomMargin=2 * cm,
        title=f'StepBuild — Nouveautés {PERIOD}', author='Stéphane Offreda — Step One', subject='Lachat Construction Sàrl',
    )
    frame = Frame(MARGIN, 2 * cm, CONTENT_W, PAGE_H - 5.3 * cm, id='main', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='page', frames=[frame], onPage=header)])
    doc.build(story())
    print('PDF :', os.path.normpath(OUTPUT))


if __name__ == '__main__':
    main()
