ALTER TABLE e_layers
DROP COLUMN layer_seq,
ADD COLUMN layer_distance INT(11) DEFAULT 0 COMMENT '距工作面相对高度';

