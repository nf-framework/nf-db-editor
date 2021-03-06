## Используемые объекты
* **Таблица базы данных** – хранилище информации в базе данных.
* **Поле данных** – часть записи или заполняемой формы, имеющая функционально самостоятельное значение и обрабатываемая как отдельный элемент данных.
* **Представление** – сохраненный запрос.
* **Функция** – программный модуль, который выполняет одну или несколько инструкций и с помощью предложения RETURN возвращает одно значение. Функция также может принимать или возвращать несколько или ни одного значения через свой список параметров.
* **Триггеры** – программы, которые выполняются в ответ на изменение данных в таблице или на возникновение определенных событий в базе данных. 
* **Тип данных** – характеристика набора данных, которая определяет:
    * диапазон возможных значений данных из набора; 
    * допустимые операции, которые можно выполнять над этими значениями; 
    * способ хранения этих значений в памяти.
    
**Комментарии** – фрагменты кода, служащие для документации программы или поясняющие ее работу.

## Идентификаторы – имена вышеперечисленных объектов.
* содержит только символы `[a-z0-9_]`, причём начинается с `[a-z]`. Обращаться по полному названию всегда `schema.object`
* должны иметь длину до 63 символов
* не являются зарезервированными словами, следуя [документации](https://www.postgresql.org/docs/current/sql-keywords-appendix.html)
* учитывая эти правила можно писать имена объектов без использования кавычек, что предпочтительно

#### Принятые правила именования по-умолчанию для конкретного раздела системы

* таблица: `xxxxx` – осмысленное,отражающее назначение раздела на сокращенном англ.языке, 
максимально компактное для уменьшения времени написания
* поле таблицы: `zzzzz` – осмысленное,отражающее назначение поля на сокращенном англ.языке,
максимально компактное для уменьшения времени написания. 
Некоторые общепринятые наименования полей в системе
    * **id** - первичный суррогатный ключ, тип данных *int8*(даже у небольших таблиц, для общей совместимости)
    * **pid** - поле ссылка на родительскую таблицу, тип данных такой же как и у первичного ключа родительской таблицы.
    Поля pid обычно задаются у сущностей, которые не могут существовать вовсе без родительской и являются, как правило,
    множественным набором какого-то свойства родительской, например, контактные данные физического лица
    * **hid** - поле иерархии
    * **date_begin, date_end** - период действия записи, тип данных *date*
    * **date_modify** - дата последней модификации записи, тип данных *timestamptz*
    * **org, grp** - организация (nfc.org) и группа организаций (nfc.grp) в зависимости от деления информации в разделе
    * **user_id** - ссылка на пользователя системы (nfc.users) 
* представление: `v4xxxxx` – основное представление для раздела, в котором обязательно присутсвуют все поля из таблицы
и разыменованные внешние ключи в виде *полеОсновнойТаблицы_полеИзВнешней*, например: *country_id_caption*.
`v4xxxxx8yyy`– дополнительные представления к разделу, где yyy назначение представления, например rep - для отчета по данному разделу
* функции: `f4xxxxx8yyy` *yyy* – смысловая нагрузка выполняемого функцией действий, например стандартные *add* - добавление,
*upd* - исправление, *del* - удаление 
* параметры функций: `p_zzzzz` Обычно *zzzzz* это наименование поля таблицы
* локальные переменные функций: `v_zzzzz`. Префиксы p_ и v_ , чтобы отличались друг от друга и от полей таблиц,
которыми чаще всего наполняются 
* триггеры: `tr4xxxxx8yyy` *yyy* – смысловая нагрузка
* ключи таблицы: 
    * первичный (primary key) `pk4xxxxx`,
    * уникальный (unique key) `uk4xxxxx8yyy` *yyy* – назначение ключа, обычно название основного уникального поля в ключе
    * внешний (foreign key) `fk4xxxxx8yyy` *yyy* – обычно наименования поля или его сокращенный вариант
* ограничения таблицы: `ch4xxxxx8yyy` *yyy* – смысловая нагрузка ограничения;
* индексы: `i4xxxxx8yyy`

#### Пример: раздел Параметры

* таблица: `params`;
* представление: `v4params`;
* функция добавления: `f4params8add`;
* триггер: `tr4params8ai`;
* ключ: `uk4params8code`, `fk4params8dt`;
* ограничение: `ch4params8trimcode`;
* индекс: `i4params8dt`.

