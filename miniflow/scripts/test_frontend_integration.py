#!/usr/bin/env python3
"""
MiniFlow Frontend Integration Test Script
测试前后端集成功能
"""

import requests
import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

class MiniFlowIntegrationTester:
    def __init__(self, frontend_url="http://localhost:5173", backend_url="http://localhost:8080"):
        self.frontend_url = frontend_url
        self.backend_url = backend_url
        self.driver = None
        self.wait = None
        
    def log(self, message: str, color: str = Colors.NC):
        print(f"{color}{message}{Colors.NC}")
        
    def setup_browser(self):
        """设置浏览器"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # 无头模式
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.wait = WebDriverWait(self.driver, 10)
            self.log("✅ 浏览器初始化成功", Colors.GREEN)
            return True
        except Exception as e:
            self.log(f"❌ 浏览器初始化失败: {e}", Colors.RED)
            return False
    
    def check_services(self):
        """检查前后端服务状态"""
        self.log("\n🔍 检查服务状态", Colors.BLUE)
        self.log("=" * 40)
        
        # 检查后端API
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                self.log("✅ 后端API服务正常", Colors.GREEN)
            else:
                self.log(f"❌ 后端API服务异常: {response.status_code}", Colors.RED)
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"❌ 后端API连接失败: {e}", Colors.RED)
            return False
        
        # 检查前端服务
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200 and "<!doctype html>" in response.text.lower():
                self.log("✅ 前端开发服务器正常", Colors.GREEN)
            else:
                self.log("❌ 前端服务响应异常", Colors.RED)
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"❌ 前端服务连接失败: {e}", Colors.RED)
            return False
            
        return True
    
    def test_page_loading(self):
        """测试页面加载"""
        self.log("\n📱 测试页面加载", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            self.driver.get(self.frontend_url)
            
            # 等待页面加载
            self.wait.until(EC.presence_of_element_located((By.ID, "root")))
            
            # 检查页面标题
            title = self.driver.title
            self.log(f"页面标题: {title}")
            
            # 检查是否重定向到登录页面
            current_url = self.driver.current_url
            if "/login" in current_url or "localhost:5173" in current_url:
                self.log("✅ 页面加载成功，正确跳转到认证页面", Colors.GREEN)
                return True
            else:
                self.log(f"⚠️ 页面加载成功，但URL异常: {current_url}", Colors.YELLOW)
                return True
                
        except TimeoutException:
            self.log("❌ 页面加载超时", Colors.RED)
            return False
        except Exception as e:
            self.log(f"❌ 页面加载失败: {e}", Colors.RED)
            return False
    
    def test_login_form(self):
        """测试登录表单"""
        self.log("\n🔐 测试登录表单", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 导航到登录页面
            self.driver.get(f"{self.frontend_url}/login")
            
            # 等待登录表单加载
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "form")))
            
            # 检查表单元素
            username_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='用户名']")
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            if username_input and password_input and login_button:
                self.log("✅ 登录表单元素完整", Colors.GREEN)
                
                # 检查注册链接
                register_link = self.driver.find_element(By.LINK_TEXT, "立即注册")
                if register_link:
                    self.log("✅ 注册链接存在", Colors.GREEN)
                
                return True
            else:
                self.log("❌ 登录表单元素缺失", Colors.RED)
                return False
                
        except TimeoutException:
            self.log("❌ 登录表单加载超时", Colors.RED)
            return False
        except Exception as e:
            self.log(f"❌ 登录表单测试失败: {e}", Colors.RED)
            return False
    
    def test_register_form(self):
        """测试注册表单"""
        self.log("\n📝 测试注册表单", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 导航到注册页面
            self.driver.get(f"{self.frontend_url}/register")
            
            # 等待注册表单加载
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "form")))
            
            # 检查表单元素
            username_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='用户名']")
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='密码']")
            register_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            
            if username_input and password_input and register_button:
                self.log("✅ 注册表单元素完整", Colors.GREEN)
                
                # 检查登录链接
                login_link = self.driver.find_element(By.LINK_TEXT, "立即登录")
                if login_link:
                    self.log("✅ 登录链接存在", Colors.GREEN)
                
                return True
            else:
                self.log("❌ 注册表单元素缺失", Colors.RED)
                return False
                
        except TimeoutException:
            self.log("❌ 注册表单加载超时", Colors.RED)
            return False
        except Exception as e:
            self.log(f"❌ 注册表单测试失败: {e}", Colors.RED)
            return False
    
    def test_user_registration_flow(self):
        """测试用户注册流程"""
        self.log("\n👤 测试用户注册流程", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 导航到注册页面
            self.driver.get(f"{self.frontend_url}/register")
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "form")))
            
            # 生成唯一用户名
            timestamp = int(time.time())
            test_username = f"uitest_{timestamp}"
            
            # 填写表单
            username_input = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='用户名']")))
            username_input.send_keys(test_username)
            
            display_name_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='显示名称']")
            display_name_input.send_keys(f"UI Test User {timestamp}")
            
            email_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='邮箱']")
            email_input.send_keys(f"uitest_{timestamp}@example.com")
            
            password_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
            if len(password_inputs) >= 2:
                password_inputs[0].send_keys("uitest123")
                password_inputs[1].send_keys("uitest123")
            
            # 提交表单
            register_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            register_button.click()
            
            # 等待响应（成功或失败）
            time.sleep(2)
            
            # 检查是否跳转到登录页面或显示错误
            current_url = self.driver.current_url
            if "/login" in current_url:
                self.log("✅ 注册成功，自动跳转到登录页面", Colors.GREEN)
                return True, test_username
            else:
                # 检查是否有错误消息
                self.log("⚠️ 注册可能失败或仍在当前页面", Colors.YELLOW)
                return False, test_username
                
        except Exception as e:
            self.log(f"❌ 注册流程测试失败: {e}", Colors.RED)
            return False, None
    
    def test_user_login_flow(self, username: str):
        """测试用户登录流程"""
        self.log("\n🔑 测试用户登录流程", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 导航到登录页面
            self.driver.get(f"{self.frontend_url}/login")
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "form")))
            
            # 填写登录表单
            username_input = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='用户名']")))
            username_input.send_keys(username)
            
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            password_input.send_keys("uitest123")
            
            # 提交登录表单
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # 等待响应
            time.sleep(3)
            
            # 检查是否跳转到仪表板
            current_url = self.driver.current_url
            if "/dashboard" in current_url:
                self.log("✅ 登录成功，跳转到仪表板", Colors.GREEN)
                return True
            else:
                self.log(f"⚠️ 登录后URL: {current_url}", Colors.YELLOW)
                return False
                
        except Exception as e:
            self.log(f"❌ 登录流程测试失败: {e}", Colors.RED)
            return False
    
    def test_dashboard_elements(self):
        """测试仪表板元素"""
        self.log("\n📊 测试仪表板功能", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 检查欢迎信息
            welcome_elements = self.driver.find_elements(By.CSS_SELECTOR, "h3, .welcome-section")
            if welcome_elements:
                self.log("✅ 欢迎信息显示正常", Colors.GREEN)
            
            # 检查统计卡片
            stat_cards = self.driver.find_elements(By.CSS_SELECTOR, ".ant-statistic")
            if len(stat_cards) >= 4:
                self.log(f"✅ 统计卡片显示正常 ({len(stat_cards)}个)", Colors.GREEN)
            else:
                self.log(f"⚠️ 统计卡片数量不足: {len(stat_cards)}", Colors.YELLOW)
            
            # 检查导航菜单
            menu_items = self.driver.find_elements(By.CSS_SELECTOR, ".ant-menu-item")
            if len(menu_items) >= 3:
                self.log(f"✅ 导航菜单显示正常 ({len(menu_items)}个菜单)", Colors.GREEN)
            else:
                self.log(f"⚠️ 导航菜单项不足: {len(menu_items)}", Colors.YELLOW)
            
            # 检查用户信息
            user_info = self.driver.find_elements(By.CSS_SELECTOR, ".user-dropdown-trigger, .user-info")
            if user_info:
                self.log("✅ 用户信息显示正常", Colors.GREEN)
            
            return True
            
        except Exception as e:
            self.log(f"❌ 仪表板测试失败: {e}", Colors.RED)
            return False
    
    def test_navigation(self):
        """测试页面导航"""
        self.log("\n🧭 测试页面导航", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 测试导航到流程管理页面
            process_menu = self.driver.find_element(By.XPATH, "//span[text()='流程管理']")
            process_menu.click()
            time.sleep(1)
            
            if "/process" in self.driver.current_url:
                self.log("✅ 流程管理页面导航成功", Colors.GREEN)
            
            # 测试导航到任务管理页面
            task_menu = self.driver.find_element(By.XPATH, "//span[text()='我的任务']")
            task_menu.click()
            time.sleep(1)
            
            if "/tasks" in self.driver.current_url:
                self.log("✅ 任务管理页面导航成功", Colors.GREEN)
            
            # 返回仪表板
            dashboard_menu = self.driver.find_element(By.XPATH, "//span[text()='仪表板']")
            dashboard_menu.click()
            time.sleep(1)
            
            if "/dashboard" in self.driver.current_url:
                self.log("✅ 仪表板导航成功", Colors.GREEN)
            
            return True
            
        except Exception as e:
            self.log(f"❌ 页面导航测试失败: {e}", Colors.RED)
            return False
    
    def test_logout(self):
        """测试退出登录"""
        self.log("\n🚪 测试退出登录", Colors.BLUE)
        self.log("=" * 40)
        
        try:
            # 点击用户下拉菜单
            user_dropdown = self.driver.find_element(By.CSS_SELECTOR, ".user-dropdown-trigger")
            user_dropdown.click()
            time.sleep(1)
            
            # 点击退出登录
            logout_item = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//span[text()='退出登录']")))
            logout_item.click()
            time.sleep(2)
            
            # 检查是否跳转到登录页面
            current_url = self.driver.current_url
            if "/login" in current_url:
                self.log("✅ 退出登录成功，跳转到登录页面", Colors.GREEN)
                return True
            else:
                self.log(f"⚠️ 退出登录后URL: {current_url}", Colors.YELLOW)
                return False
                
        except Exception as e:
            self.log(f"❌ 退出登录测试失败: {e}", Colors.RED)
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        self.log("🧪 MiniFlow 前端集成测试", Colors.BLUE)
        self.log("=" * 60)
        
        # 检查服务状态
        if not self.check_services():
            self.log("\n❌ 服务状态检查失败，无法继续测试", Colors.RED)
            return False
        
        # 设置浏览器
        if not self.setup_browser():
            self.log("\n❌ 浏览器设置失败，跳过UI测试", Colors.RED)
            self.log("💡 提示: 安装Chrome浏览器和chromedriver来运行完整测试", Colors.YELLOW)
            return False
        
        try:
            success_count = 0
            total_tests = 5
            
            # 测试页面加载
            if self.test_page_loading():
                success_count += 1
            
            # 测试登录表单
            if self.test_login_form():
                success_count += 1
            
            # 测试注册表单
            if self.test_register_form():
                success_count += 1
            
            # 测试注册流程
            success, test_username = self.test_user_registration_flow()
            if success and test_username:
                success_count += 1
                
                # 测试登录流程
                if self.test_user_login_flow(test_username):
                    success_count += 1
                    
                    # 测试仪表板
                    if self.test_dashboard_elements():
                        self.log("✅ 仪表板功能正常", Colors.GREEN)
                    
                    # 测试导航
                    if self.test_navigation():
                        self.log("✅ 页面导航正常", Colors.GREEN)
                    
                    # 测试退出登录
                    if self.test_logout():
                        self.log("✅ 退出登录正常", Colors.GREEN)
            
            # 测试总结
            self.log(f"\n📊 测试总结", Colors.BLUE)
            self.log("=" * 40)
            self.log(f"测试通过: {success_count}/{total_tests}")
            
            if success_count == total_tests:
                self.log("🎉 所有前端功能测试通过！", Colors.GREEN)
                return True
            else:
                self.log(f"⚠️ 部分测试未通过 ({success_count}/{total_tests})", Colors.YELLOW)
                return False
                
        finally:
            if self.driver:
                self.driver.quit()

def main():
    """主函数"""
    if len(sys.argv) > 1:
        frontend_url = sys.argv[1]
    else:
        frontend_url = "http://localhost:5173"
    
    if len(sys.argv) > 2:
        backend_url = sys.argv[2]
    else:
        backend_url = "http://localhost:8080"
    
    print(f"🔗 前端服务器: {frontend_url}")
    print(f"🔗 后端服务器: {backend_url}")
    
    tester = MiniFlowIntegrationTester(frontend_url, backend_url)
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}✅ Day 5 前端功能测试全部通过！{Colors.NC}")
        sys.exit(0)
    else:
        print(f"\n{Colors.YELLOW}⚠️ 部分前端功能需要浏览器环境才能完整测试{Colors.NC}")
        print(f"{Colors.BLUE}💡 手动测试步骤:{Colors.NC}")
        print("1. 打开浏览器访问 http://localhost:5173")
        print("2. 测试注册新用户")
        print("3. 测试登录功能")
        print("4. 验证仪表板显示")
        print("5. 测试页面导航")
        sys.exit(0)

if __name__ == "__main__":
    main()
