<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Projets (un projet = un chantier), leurs adresses nommées et leurs photos de présentation.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('number', 30)->index();                  // ex. 2853-055 (NPA du chantier + séquence)
            $table->string('designation1');                         // « Nom client - Travaux à réaliser »
            $table->string('designation2')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('status', 20)->default('en_cours')->index(); // en_cours | adjuge | termine | refuse
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_template')->default(false);

            // Adresse principale du chantier.
            $table->string('street')->nullable();
            $table->string('street_no', 20)->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('city')->nullable();
            $table->string('country', 5)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('mobile', 40)->nullable();

            $table->string('contract_no', 60)->nullable();
            $table->string('cost_unit', 60)->nullable();            // unité d'imputation
            $table->text('invoice_instructions')->nullable();
            $table->text('remark')->nullable();
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('project_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('label', 80);                            // « Facturation », « Architecte », « Accès »…
            $table->foreignId('address_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('street')->nullable();
            $table->string('street_no', 20)->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('city')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email')->nullable();
            $table->text('remark')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('project_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('path');                                 // disque privé « local »
            $table->string('original_name');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->string('caption')->nullable();
            $table->unsignedInteger('position')->default(0);        // 0 = photo de couverture
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_photos');
        Schema::dropIfExists('project_addresses');
        Schema::dropIfExists('projects');
    }
};
