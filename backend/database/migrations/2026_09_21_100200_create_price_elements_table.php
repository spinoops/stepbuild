<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Éléments de coûts (listes de prix) par famille :
     * 1 salaire · 2 matériaux · 3 machines/engins · 4 matériaux d'exploitation · 5 outillage · 6 tiers.
     * Trois niveaux de prix : fournisseur (brut), net, régie (majoré).
     */
    public function up(): void
    {
        Schema::create('price_elements', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('family')->index();
            $table->string('group_code', 20)->nullable()->index();
            $table->string('number', 30);
            $table->string('description', 500);
            $table->string('unit', 20)->nullable();
            $table->string('unit_regie', 20)->nullable();
            $table->decimal('supplier_price', 12, 2)->nullable();
            $table->decimal('net_price', 12, 2)->nullable();
            $table->decimal('regie_price', 12, 2)->nullable();
            $table->string('regie_code', 30)->nullable();
            $table->decimal('unit_factor', 10, 4)->default(1);
            $table->decimal('discount_amount', 12, 2)->nullable();
            $table->decimal('discount_percent', 5, 2)->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['family', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_elements');
    }
};
