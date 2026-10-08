<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stocks : un produit suivi = un élément de coûts (matériaux, outillage…) avec sa quantité en
 * stock, son seuil d'alerte et son emplacement ; chaque modification laisse un mouvement
 * (entrée, sortie, inventaire) daté et signé.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_element_id')->unique()->constrained('price_elements')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('min_quantity', 12, 2)->nullable();     // seuil « à commander »
            $table->string('location', 60)->nullable();              // dépôt, étagère, véhicule…
            $table->string('note', 255)->nullable();
            $table->timestamp('counted_at')->nullable();             // dernier mouvement
            $table->foreignId('counted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_item_id')->constrained('stock_items')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 12);                               // entree | sortie | inventaire
            $table->decimal('quantity', 12, 2);                      // variation signée
            $table->decimal('quantity_after', 12, 2);
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['stock_item_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_items');
    }
};
