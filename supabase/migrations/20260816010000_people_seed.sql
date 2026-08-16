-- =====================================================================
-- Seed: equipo, contratistas y proveedores de Eduardo + proyecto Casa Alba I
-- Run AFTER 20260816000000_caja.sql. Safe to re-run.
-- =====================================================================
do $$
declare u record;
begin
  for u in select id from public.profiles loop
    insert into public.people (user_id, name, role)
    select u.id, x.name, x.role from (values
      ('Paulina (PH)',            'Personal administrativo'),
      ('Alberto',                 'Arquitecto de oficina'),
      ('Abdiel',                  'Arquitecto de oficina'),
      ('Emilio',                  'Supervisor de obra'),
      ('Gabriel Alejandro',       'Supervisor de obra · jefe del equipo'),
      ('Jhonatan',                'CEO'),
      ('Cristóbal Salinas',       'Contratista eléctrico'),
      ('Juan Sosa',               'Contratista de cantera'),
      ('FAFSA',                   'Contratista de estructuras y acero'),
      ('CABSA',                   'Contratista de carpintería'),
      ('Ing. Hugo Carrillo',      'Contratista de carpintería'),
      ('GMC Gareth Montelongo',   'Contratista de telecomunicaciones'),
      ('Gustavo',                 'Electricista'),
      ('Bulnes',                  'Proveedor de herrajes'),
      ('Manuel',                  'Contratista de tablaroca y pintura'),
      ('Hugo Panuco',             'Tercero · préstamo')
    ) as x(name, role)
    where not exists (select 1 from public.people p where p.user_id = u.id and lower(p.name) = lower(x.name));

    -- Update roles if the person already existed without role
    update public.people p set role = x.role
    from (values
      ('Gabriel','Supervisor de obra · jefe del equipo'),('Alejandro','Supervisor de obra · jefe del equipo'),
      ('Manuel','Contratista de tablaroca y pintura'),('Juan Sosa','Contratista de cantera'),
      ('Cristóbal Salinas','Contratista eléctrico'),('Hugo Panuco','Tercero · préstamo'),('PH','Personal administrativo')
    ) as x(name, role)
    where p.user_id = u.id and lower(p.name) = lower(x.name) and p.role is null;

    insert into public.projects (user_id, name, kind, status, sort_order)
    select u.id, 'Casa Alba I', 'obra', 'proyecto', 13
    where not exists (select 1 from public.projects p where p.user_id = u.id and p.name = 'Casa Alba I');
  end loop;
end $$;
