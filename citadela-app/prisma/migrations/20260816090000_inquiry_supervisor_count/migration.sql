-- Pocet osob dozoru u skupin s nezletilymi (skolni vylety, tabory).
-- Rezim domu se dopocitava ze segmentu, ukladat ho zvlast by znamenalo dve pravdy.
ALTER TABLE "Inquiry" ADD COLUMN     "supervisorCount" INTEGER;
