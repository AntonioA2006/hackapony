"""endurecimiento para Supabase: RLS en todas las tablas y sin permisos para anon/authenticated

Supabase publica el esquema `public` mediante su Data API (PostgREST) a los roles `anon` y
`authenticated`. Agua Alerta no usa esa API: solo la API propia, que se conecta como dueña de
las tablas. Activar RLS sin políticas y revocar permisos cierra ese acceso público.
En un PostgreSQL sin esos roles (desarrollo, CI) la revocación se omite.

Revision ID: 004
Revises: 003
"""

from typing import Sequence, Union

from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_POSTGIS = ("spatial_ref_sys",)


def upgrade() -> None:
    op.execute(
        f"""
        DO $$
        DECLARE t text;
        BEGIN
          FOR t IN SELECT tablename FROM pg_tables
                   WHERE schemaname = 'public' AND tablename NOT IN {_POSTGIS!r}
          LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
          END LOOP;
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            FOR t IN SELECT tablename FROM pg_tables
                     WHERE schemaname = 'public' AND tablename NOT IN {_POSTGIS!r}
            LOOP
              EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
            END LOOP;
          END IF;
        END $$;
        """.replace("('spatial_ref_sys',)", "('spatial_ref_sys')")
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE t text;
        BEGIN
          FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys'
          LOOP
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
          END LOOP;
        END $$;
        """
    )
