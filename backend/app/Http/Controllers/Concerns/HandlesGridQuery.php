<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Paramètres communs des grilles du front :
 *   ?search=…            recherche plein texte (scope search du modèle)
 *   ?filter[colonne]=…   filtre « contient » par colonne (ligne de filtre de la grille)
 *   ?sort=colonne&dir=asc|desc
 *   ?page=…&per_page=…   (10 à 500, 100 par défaut)
 */
trait HandlesGridQuery
{
    /**
     * @param  list<string>  $filterable
     * @param  list<string>  $sortable
     */
    protected function paginateGrid(
        Builder $query,
        Request $request,
        array $filterable,
        array $sortable,
        string $defaultSort,
        string $defaultDir = 'asc',
    ): LengthAwarePaginator {
        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->search($search);
        }

        foreach ((array) $request->query('filter', []) as $column => $value) {
            $value = trim((string) $value);
            if ($value !== '' && in_array($column, $filterable, true)) {
                $query->where($column, 'like', '%'.addcslashes($value, '%_\\').'%');
            }
        }

        $sort = (string) $request->query('sort', '');
        $dir = $request->query('dir') === 'desc' ? 'desc' : 'asc';
        if (in_array($sort, $sortable, true)) {
            $query->orderBy($sort, $dir);
        } else {
            $query->orderBy($defaultSort, $defaultDir);
        }
        $query->orderBy($query->getModel()->getQualifiedKeyName());

        $perPage = min(500, max(10, (int) $request->query('per_page', 100)));

        return $query->paginate($perPage)->withQueryString();
    }
}
