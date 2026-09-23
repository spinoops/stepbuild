<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sous-détails de prix types : un modèle par ouvrage (pose carrelage, crépi de fond, coffrage…),
     * chargé dans le sous-détail d'une position de devis. Rattachable plus tard à un article du catalogue.
     */
    public function up(): void
    {
        Schema::create('breakdown_templates', function (Blueprint $table) {
            $table->id();
            $table->string('group', 80)->nullable()->index();          // corps de métier
            $table->string('name');
            $table->foreignId('catalog_article_id')->nullable()->constrained('catalog_articles')->nullOnDelete();
            $table->decimal('dimension', 12, 3)->nullable();           // dimension de référence par défaut
            $table->string('dimension_unit', 20)->nullable();
            $table->boolean('price_per_dimension')->default(false);
            $table->text('note')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('breakdown_template_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('breakdown_template_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('family');
            $table->foreignId('price_element_id')->nullable()->constrained('price_elements')->nullOnDelete();
            $table->string('label');
            $table->string('unit', 20)->nullable();
            $table->decimal('quantity', 12, 4)->default(1);
            $table->boolean('per_dimension')->default(false);
            $table->decimal('pack_size', 12, 4)->nullable();
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('markup_percent', 6, 2)->default(0);
            $table->string('note')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('breakdown_template_lines');
        Schema::dropIfExists('breakdown_templates');
    }
};
