<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catalogue d'articles par corps de métier. Les chapitres servent aussi de
     * « modèles d'étapes » : on les choisit dans un devis pour créer ses étapes.
     */
    public function up(): void
    {
        Schema::create('catalog_chapters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('catalog_chapters')->nullOnDelete();
            $table->string('code', 20);
            $table->string('label');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'code']);
        });

        Schema::create('catalog_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_chapter_id')->constrained('catalog_chapters')->cascadeOnDelete();
            $table->string('code', 20)->nullable();
            $table->string('sub_code', 20)->nullable();
            $table->text('description');
            $table->string('unit', 20)->nullable();
            $table->decimal('purchase_price', 12, 2)->nullable();
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->string('work_type', 20)->nullable();
            $table->string('category', 50)->nullable();
            $table->boolean('is_title')->default(false);
            $table->unsignedInteger('usage_count')->default(0); // les plus utilisés remontent en premier
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['catalog_chapter_id', 'code', 'sub_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_articles');
        Schema::dropIfExists('catalog_chapters');
    }
};
