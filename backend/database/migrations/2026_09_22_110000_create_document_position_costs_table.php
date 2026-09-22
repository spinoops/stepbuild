<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sous-détail de prix d'une position de devis : le prix de vente se construit à partir des coûts,
     * rangés par famille (MO, MAT, MACH, MAT EX, OUT, ST), rapportés à une dimension de l'ouvrage
     * (9 m², 1 WC…), puis majorés. Remplace les formules notées en texte libre dans BauBit.
     */
    public function up(): void
    {
        Schema::table('document_positions', function (Blueprint $table) {
            $table->decimal('dimension', 12, 3)->nullable()->after('internal_remark');   // DIM : 9 (m²)
            $table->string('dimension_unit', 20)->nullable()->after('dimension');
            $table->boolean('price_per_dimension')->default(false)->after('dimension_unit'); // prix = total ÷ dimension
            $table->decimal('calculated_price', 12, 2)->nullable()->after('price_per_dimension'); // vente issue du sous-détail
        });

        Schema::create('document_position_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_position_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('family');                       // 1 MO · 2 MAT · 3 MACH · 4 MAT EX · 5 OUT · 6 ST
            $table->foreignId('price_element_id')->nullable()->constrained('price_elements')->nullOnDelete();
            $table->string('label', 255);
            $table->string('unit', 20)->nullable();                      // kg, h, J, pce…
            $table->decimal('quantity', 12, 4)->default(1);              // par unité de dimension si per_dimension
            $table->boolean('per_dimension')->default(false);            // 4.2 kg/m² × DIM
            $table->decimal('pack_size', 12, 4)->nullable();             // conditionnement : arrondi au sac / à l'unité entière
            $table->decimal('unit_cost', 12, 2)->default(0);             // coût par unité (ou par conditionnement)
            $table->decimal('markup_percent', 6, 2)->default(0);
            $table->decimal('cost', 14, 2)->default(0);                  // quantité facturée × coût unitaire
            $table->decimal('sale', 14, 2)->default(0);                  // coût majoré
            $table->string('note', 255)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_position_costs');
        Schema::table('document_positions', function (Blueprint $table) {
            $table->dropColumn(['dimension', 'dimension_unit', 'price_per_dimension', 'calculated_price']);
        });
    }
};
