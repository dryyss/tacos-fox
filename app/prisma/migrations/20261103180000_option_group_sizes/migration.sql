-- Burgers et sandwichs « seul ou menu » : un groupe d'options (accompagnement, boisson) peut ne valoir que pour certaines formules
ALTER TABLE "OptionGroup" ADD COLUMN "sizeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
