-- before
ALTER TABLE e_layers
DROP COLUMN layer_seq,
ADD COLUMN layer_distance INT(11) DEFAULT 0 COMMENT '距工作面相对高度';

-- 2025-4-11
ALTER TABLE `msEvents`.`e_project`
ADD COLUMN `is_finished` TINYINT(1) NOT NULL DEFAULT 0;