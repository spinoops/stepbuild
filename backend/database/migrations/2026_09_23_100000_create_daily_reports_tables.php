<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rapports journaliers (phase 4) : collaborateurs, types de travail non productifs, rapports
     * d'un projet rattachés à son devis, heures par collaborateur et par étape du devis, ressources
     * consommées (matériaux, machines, outillage, tiers) et fichiers joints.
     */
    public function up(): void
    {
        Schema::create('collaborators', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20)->nullable();
            $table->string('last_name');
            $table->string('first_name')->nullable();
            $table->decimal('hourly_cost', 8, 2)->nullable();       // tarif horaire de base (coût brut)
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // compte de connexion (ouvrier)
            $table->boolean('is_active')->default(true)->index();
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Colonnes supplémentaires de la grille des heures : travail du samedi, repas, kilomètres, formation…
        Schema::create('work_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20);
            $table->string('label');
            $table->string('unit', 10)->default('h');              // h | nb | km
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete(); // devis de rattachement
            $table->unsignedInteger('sequence');                     // 1, 2, 3… par projet
            $table->string('number', 10);                            // 001
            $table->date('date')->index();
            $table->string('status', 20)->default('en_cours')->index(); // en_cours | en_controle | facture
            $table->boolean('is_regie')->default(true);
            $table->foreignId('responsible_id')->nullable()->constrained('collaborators')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remark')->nullable();
            $table->text('events')->nullable();
            $table->string('weather', 60)->nullable();
            $table->smallInteger('temp_min')->nullable();
            $table->smallInteger('temp_max')->nullable();
            $table->decimal('total_hours', 8, 2)->default(0);        // heures productives (étapes)
            $table->decimal('total_amount', 12, 2)->default(0);      // coût brut : heures + ressources
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'date']);
        });

        // Une cellule de la grille « Salaire » : collaborateur × étape du devis (ou type de travail).
        // Une ligne sans étape ni type de travail marque la présence du collaborateur dans le rapport.
        Schema::create('daily_report_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collaborator_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_step_id')->nullable()->constrained('document_steps')->nullOnDelete();
            $table->foreignId('work_type_id')->nullable()->constrained('work_types')->nullOnDelete();
            $table->decimal('quantity', 8, 2)->default(0);
            $table->decimal('hourly_cost', 8, 2)->nullable();       // instantané du tarif du collaborateur
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['daily_report_id', 'collaborator_id']);
        });

        // Ressources consommées : 2 matériaux, 3 machines, 4 matériaux d'exploitation, 5 outillage, 6 tiers.
        Schema::create('daily_report_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('family');
            $table->foreignId('document_step_id')->nullable()->constrained('document_steps')->nullOnDelete();
            $table->foreignId('price_element_id')->nullable()->constrained('price_elements')->nullOnDelete();
            $table->string('label');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 12, 3)->default(1);
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('note')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('daily_report_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_report_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->boolean('is_image')->default(false);
            $table->string('caption')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_report_files');
        Schema::dropIfExists('daily_report_items');
        Schema::dropIfExists('daily_report_hours');
        Schema::dropIfExists('daily_reports');
        Schema::dropIfExists('work_types');
        Schema::dropIfExists('collaborators');
    }
};
