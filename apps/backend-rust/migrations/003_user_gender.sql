-- 用户性别（前端表格列 / 查询项 / 表单 / 详情都需要）
-- 取值与官方字典 user_gender 一致：0 未设置、1 男、2 女
ALTER TABLE system_user ADD COLUMN gender INTEGER NOT NULL DEFAULT 0;

-- 内置演示账号补一个值，避免列表里全是「未设置」
UPDATE system_user
SET gender = CASE username
    WHEN 'vben' THEN 1
    WHEN 'admin' THEN 1
    WHEN 'jack' THEN 1
    ELSE gender
END
WHERE gender = 0;
