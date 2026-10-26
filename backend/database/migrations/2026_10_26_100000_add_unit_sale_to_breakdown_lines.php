<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prix de vente unitaire d'une ligne de sous-détail (position ou modèle) : vente = quantité × prix de vente.
 * Vide → vente = coût × (1 + majoration), comme avant. Rattachée à un élément de coûts, la ligne prend
 * son prix d'achat (prix net) et son prix de vente (prix régie) tels quels.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_position_costs', function (Blueprint $table) {
            $table->decimal('unit_sale', 12, 2)->nullable()->after('unit_cost');
        });
        Schema::table('breakdown_template_lines', function (Blueprint $table) {
            $table->decimal('unit_sale', 12, 2)->nullable()->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('document_position_costs', fn (Blueprint $table) => $table->dropColumn('unit_sale'));
        Schema::table('breakdown_template_lines', fn (Blueprint $table) => $table->dropColumn('unit_sale'));
    }
};
