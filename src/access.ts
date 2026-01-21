export default (initialState: { currentUser?: any }) => {
  const { currentUser } = initialState || {};
  return {
    // 是否是超级管理员
    isAdmin: currentUser && currentUser.role === 'admin',
    // 普通用户权限（或者直接判断登录）
    isUser: currentUser && (currentUser.role === 'user' || currentUser.role === 'admin'),
  };
};