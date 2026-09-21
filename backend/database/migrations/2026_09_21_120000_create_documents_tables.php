<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Documents commerciaux d'un projet (devis, puis acomptes et factures), leurs étapes et positions.
     * Les étapes du devis structurent tout le suivi du chantier (rapports, régie, facture).
     */
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('devis')->index();      // devis | acompte | facture
            $table->unsignedInteger('sequence');                          // 1, 2, 3… par projet et par type
            $table->string('number', 60)->index();                        // ex. 2853-055-DE.1
            $table->string('title')->nullable();
            $table->date('date');
            $table->string('status', 20)->default('en_cours')->index();   // en_cours | envoye | accepte | refuse

            // Destinataire : instantané de l'adresse au moment du devis (modifiable sans toucher au carnet).
            $table->foreignId('address_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('recipient_title', 30)->nullable();
            $table->string('recipient_name')->nullable();
            $table->string('recipient_first_name')->nullable();
            $table->string('recipient_street')->nullable();
            $table->string('recipient_street_no', 20)->nullable();
            $table->string('recipient_zip', 10)->nullable();
            $table->string('recipient_city')->nullable();
            $table->string('recipient_email')->nullable();

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // responsable
            $table->string('initials', 10)->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();

            $table->decimal('vat_rate', 5, 2)->default(8.10);
            $table->decimal('discount_percent', 5, 2)->nullable();
            $table->decimal('total_net', 14, 2)->default(0);       // somme des positions (hors options)
            $table->decimal('discount_amount', 14, 2)->default(0);
            $table->decimal('total_vat', 14, 2)->default(0);
            $table->decimal('rounding', 6, 2)->default(0);         // arrondi à 5 centimes
            $table->decimal('total_gross', 14, 2)->default(0);     // TTC arrondi

            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('document_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_chapter_id')->nullable()->constrained('catalog_chapters')->nullOnDelete(); // modèle d'origine
            $table->string('code', 20);
            $table->string('label');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('document_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_step_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_article_id')->nullable()->constrained('catalog_articles')->nullOnDelete();
            $table->string('kind', 10)->default('item');           // item | title | text
            $table->string('code', 40)->nullable();                // ex. 12.025
            $table->text('description');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 12, 3)->nullable();
            $table->decimal('unit_price', 12, 2)->nullable();      // prix de vente
            $table->decimal('cost_price', 12, 2)->nullable();      // prix de revient (marge)
            $table->decimal('amount', 14, 2)->nullable();          // quantité × prix
            $table->boolean('is_optional')->default(false);        // option : affichée mais hors total
            $table->text('internal_remark')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_positions');
        Schema::dropIfExists('document_steps');
        Schema::dropIfExists('documents');
    }
};
