#include <iostream>
#include <vector>
#include <string>
#include <functional>
#include <cstdlib>
#include <ctime>
#include <windows.h>

using namespace std;

struct Settings {
    int length = 8;
};

class Logger {
private:
    vector<string> logs;

public:
    Logger() {}
    ~Logger() {}

    void add(string msg) {
        logs.push_back(msg);
        cout << "[Событие]: " << msg << endl;
    }

    vector<string> getLogs() {
        return logs;
    }

    void printAll() {
        cout << "\n--- Журнал событий ---" << endl;
        for (int i = 0; i < logs.size(); i++) {
            cout << i + 1 << ". " << logs[i] << endl;
        }
        cout << "----------------------" << endl;
    }
};

class Level {
public:
    virtual string create(int len) = 0;
    virtual string getTitle() = 0;
    virtual ~Level() {}
};

class EasyLevel : public Level {
public:
    string create(int len) override {
        string chars = "abcdefghijklmnopqrstuvwxyz";
        string pass = "";
        for (int i = 0; i < len; i++) {
            pass += chars[rand() % chars.length()];
        }
        return pass;
    }
    string getTitle() override { return "Простой"; }
};

class HardLevel : public Level {
public:
    string create(int len) override {
        string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        string pass = "";
        for (int i = 0; i < len; i++) {
            pass += chars[rand() % chars.length()];
        }
        return pass;
    }
    string getTitle() override { return "Сложный"; }
};

class Password {
private:
    string value;
    string levelName;

public:
    Password(string v = "", string l = "") {
        value = v;
        levelName = l;
    }
    ~Password() {}

    string getValue() { return value; }
    void setValue(string v) { value = v; }

    bool operator==(const Password& other) {
        return value == other.value;
    }

    friend ostream& operator<<(ostream& out, const Password& p) {
        out << p.value << " (" << p.levelName << ")";
        return out;
    }
};

class Generator {
private:
    Settings settings;
    Level* level;
    Logger* logger;
    vector<Password> history;

public:
    function<void(string)> onEvent;

    Generator(Logger* log) {
        logger = log;
        level = nullptr;
        onEvent = [this](string text) {
            if (logger) logger->add(text);
            };
        onEvent("1. Генератор запущен");
    }

    ~Generator() {
        onEvent("2. Генератор завершил работу");
    }

    void setLevel(Level* lvl) {
        level = lvl;
        onEvent("3. Выбран уровень: " + level->getTitle());
    }

    void setLength(int len) {
        if (len < 4) {
            settings.length = 4;
            onEvent("4. Ошибка: длина меньше 4! Поставили 4");
        }
        else {
            settings.length = len;
            onEvent("5. Длина изменена на " + to_string(len));
        }
    }

    int getLength() {
        return settings.length;
    }

    Password make() {
        if (!level) {
            onEvent("Ошибка: не выбран уровень!");
            return Password();
        }
        string str = level->create(settings.length);
        Password p(str, level->getTitle());
        history.push_back(p);
        onEvent("6. Сгенерирован новый пароль");
        return p;
    }

    void showHistory() {
        onEvent("7. Просмотр истории паролей");
        cout << "\n--- История ---" << endl;
        for (int i = 0; i < history.size(); i++) {
            cout << i + 1 << ". " << history[i] << endl;
        }
        cout << "---------------" << endl;
    }
};

int main() {
    SetConsoleCP(65001);
    SetConsoleOutputCP(65001);
    srand(time(0));

    Logger logger;
    Generator gen(&logger);
    EasyLevel easy;
    HardLevel hard;

    gen.setLevel(&easy);

    int choice = -1;
    while (choice != 0) {
        cout << "\n1. Простой уровень\n"
            << "2. Сложный уровень\n"
            << "3. Изменить длину (сейчас: " << gen.getLength() << ")\n"
            << "4. Создать пароль\n"
            << "5. История паролей\n"
            << "6. Журнал событий\n"
            << "0. Выход\n"
            << "Выбор: ";
        cin >> choice;

        if (choice == 1) gen.setLevel(&easy);
        else if (choice == 2) gen.setLevel(&hard);
        else if (choice == 3) {
            int l;
            cout << "Новая длина: ";
            cin >> l;
            gen.setLength(l);
        }
        else if (choice == 4) {
            Password p = gen.make();
            cout << "Результат: " << p << endl;
        }
        else if (choice == 5) gen.showHistory();
        else if (choice == 6) logger.printAll();
    }

    return 0;
}
