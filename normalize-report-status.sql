UPDATE "Report"
SET "status" = CASE
  WHEN lower(trim("status")) IN ('concluido','concluído','concluida','concluída') THEN 'CONCLUIDO'
  WHEN lower(trim("status")) IN ('em andamento','emandamento','em_andamento','em-andamento') THEN 'EM ANDAMENTO'
  WHEN lower(trim("status")) IN ('pendente') THEN 'PENDENTE'
  WHEN lower(trim("status")) IN ('espera de terceiros','espera_de_terceiros','espera-de-terceiros') THEN 'ESPERA DE TERCEIROS'
  ELSE trim("status")
END
WHERE "status" IS NOT NULL;
