<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reprise des données BauBit : clé d'origine (ex. CEL-13622, FPO-412, FCH-14) sur les chapitres,
 * les articles et les éléments de coûts, pour relancer l'import sans doublon et garder la trace.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['catalog_chapters', 'catalog_articles', 'price_elements'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('baubit_id', 30)->nullable()->index()->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (['catalog_chapters', 'catalog_articles', 'price_elements'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropIndex([$t->getTable().'_baubit_id_index']);
                $t->dropColumn('baubit_id');
            });
        }
    }
};
