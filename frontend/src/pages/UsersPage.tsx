import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { useAuth } from '@/auth/AuthContext'
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '@/hooks/useUsers'
import type { Role, User } from '@/types'
import { ROLES, ROLE_COLORS, ROLE_LABELS } from '@/lib/roles'
import { toast } from '@/lib/toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'

const schema = z.object({
  name: z.string().min(1, 'Nom requis.'),
  email: z.string().email('Email invalide.'),
  password: z.string(),
  role: z.enum(['admin', 'responsable', 'ouvrier']),
})

type FormValues = z.infer<typeof schema>

function firstValidationError(err: unknown): string | null {
  if (isAxiosError(err) && err.response?.status === 422) {
    const errors = err.response.data?.errors as Record<string, string[]> | undefined
    return errors ? (Object.values(errors)[0]?.[0] ?? 'Données invalides.') : 'Données invalides.'
  }
  return null
}

export default function UsersPage() {
  const { user: current } = useAuth()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useUsers(search)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'ouvrier' },
  })

  function openCreate() {
    setEditing(null)
    setFormError(null)
    reset({ name: '', email: '', password: '', role: 'ouvrier' })
    setModalOpen(true)
  }

  function openEdit(target: User) {
    setEditing(target)
    setFormError(null)
    reset({
      name: target.name,
      email: target.email,
      password: '',
      role: (target.roles[0] as Role | undefined) ?? 'ouvrier',
    })
    setModalOpen(true)
  }

  function onSubmit(values: FormValues) {
    setFormError(null)
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password || undefined,
      roles: [values.role],
    }
    const onSuccess = () => {
      setModalOpen(false)
      toast(editing ? 'Utilisateur mis à jour.' : 'Utilisateur créé.', 'success')
    }
    const onError = (err: unknown) => setFormError(firstValidationError(err) ?? 'Une erreur est survenue.')

    if (editing) {
      updateUser.mutate({ id: editing.id, payload }, { onSuccess, onError })
    } else {
      createUser.mutate(payload, { onSuccess, onError })
    }
  }

  function remove(target: User) {
    if (!window.confirm(`Supprimer ${target.name} ?`)) {
      return
    }
    deleteUser.mutate(target.id, {
      onSuccess: () => toast('Utilisateur supprimé.', 'success'),
      onError: (err) => {
        if (isAxiosError(err)) {
          toast(err.response?.data?.message ?? 'Suppression impossible.', 'error')
        }
      },
    })
  }

  const saving = createUser.isPending || updateUser.isPending

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Comptes ayant accès à l'application et leur rôle (administrateur, responsable, ouvrier)."
      >
        <Button onClick={openCreate}>Nouvel utilisateur</Button>
      </PageHeader>

      <div>
        <Input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rôles</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.data.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.roles.map((roleName) => (
                        <Badge key={roleName} className={ROLE_COLORS[roleName] ?? ''}>
                          {ROLE_LABELS[roleName] ?? roleName}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      Modifier
                    </button>
                    {item.id !== current?.id && (
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="ml-3 text-sm text-red-600 hover:text-red-800"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Input label="Nom" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input
            label={editing ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Select label="Rôle" error={errors.role?.message} {...register('role')}>
            {ROLES.map((roleName) => (
              <option key={roleName} value={roleName}>
                {ROLE_LABELS[roleName]}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
