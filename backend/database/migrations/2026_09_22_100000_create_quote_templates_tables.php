<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Modèles de devis : un jeu d'étapes ordonné, appliqué en un clic à un nouveau devis.
     */
    public function up(): void
    {
        Schema::create('quote_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('quote_template_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_chapter_id')->nullable()->constrained('catalog_chapters')->nullOnDelete();
            $table->string('code', 20);
            $table->string('label');
            $table->boolean('with_articles')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_template_steps');
        Schema::dropIfExists('quote_templates');
    }
};
