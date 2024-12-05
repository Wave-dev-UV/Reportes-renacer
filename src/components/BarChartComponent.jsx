import React, { useState, useEffect } from 'react';
import { db, collection, getDocs } from '../firebase/firebase';  
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styled from 'styled-components';

const BarChartComponent = () => {
  const [data, setData] = useState([]); 
  const [fullData, setFullData] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [selectedYears, setSelectedYears] = useState([]); // Lista de objetos con la estructura { año: <año>, value: <booleano> }
  const [selectedMonths, setSelectedMonths] = useState({}); // Objeto para almacenar meses seleccionados por año
  const [yearsData, setYearsData] = useState([]); // Lista donde almacenaremos los años de los usuarios
  const [monthsData, setMonthsData] = useState([]);
  const [selectAll, setSelectAll] = useState(true); // Estado de "Todos", por defecto está marcado
  const [availableMonths, setAvailableMonths] = useState({}); // Estado para almacenar los meses disponibles por año
  const [reportType, setReportType] = useState('general'); // Tipo de reporte (general o por franja de edad)
  const [ageYearsData, setAgeYarsData] = useState([]); //años separados por edad
  const [ageMonthsData, setAgeMonthsData] = useState([]); //años separados por edad
  const [esconderTipos, setEsconderTipos] = useState(true)
  const [esconderPeriodos, setEsconderPeriodos] = useState(true)

  const hadleEsconderTipo = () =>{
    setEsconderTipos(!esconderTipos)
  }

  const hadleEsconderPeriodo = () =>{
    setEsconderPeriodos(!esconderPeriodos)
  }
  // Lista con los nombres abreviados de los meses
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const categorizeAge = (birthDate) => {
  const today = new Date();
  const ageInMilliseconds = today - birthDate;
  const ageInYears = new Date(ageInMilliseconds).getUTCFullYear() - 1970;  // Calculamos la edad en años

  if (ageInYears <= 12) {
    return 'niños';
  } else if (ageInYears <= 25) {
    return 'jovenes';
  } else {
    return 'adultos';
  }
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        
        const years = [];
        const monthsYears = []
        const yearAgeCategory = {};
        const monthAgeCategory = {};

        querySnapshot.forEach((doc) => {
          const user = doc.data();
          if (user.fechaCreacion  && user.fechaNacimiento) {
            const year = user.fechaCreacion.toDate().getFullYear();
            const month = user.fechaCreacion.toDate().getMonth()+1;
            const monthKey = `${year}${month}`;
            years.push(year);
            monthsYears.push(year+""+month);

            const birthDate = user.fechaNacimiento.toDate();
            const ageCategory = categorizeAge(birthDate);
          
            if (!yearAgeCategory[year]) {
              yearAgeCategory[year] = { niños: 0, jovenes: 0, adultos: 0 };
            }
            yearAgeCategory[year][ageCategory]++;

            // Clasificar por mes
            if (!monthAgeCategory[monthKey]) {
              monthAgeCategory[monthKey] = { niños: 0, jovenes: 0, adultos: 0 };
            }
            monthAgeCategory[monthKey][ageCategory]++;

          }
        });

         // Generar los datos para meses
        const charDataMonthsAge = Object.keys(monthAgeCategory).map(month => ({
          name: month,
          niños: monthAgeCategory[month].niños || 0,
          jovenes: monthAgeCategory[month].jovenes || 0,
          adultos: monthAgeCategory[month].adultos || 0
        }));

        // Generar los datos para años
        const charDataYearsAge = Object.keys(yearAgeCategory).map(year => ({
          name: year,
          niños: yearAgeCategory[year].niños || 0,
          jovenes: yearAgeCategory[year].jovenes || 0,
          adultos: yearAgeCategory[year].adultos || 0
        }));

        const yearsCount = years.reduce((acc, year) => {
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {});

        const yearsMonthsCount = monthsYears.reduce((acc, month) => {
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        const charDataMonths = Object.keys(yearsMonthsCount).map(month => ({
          name: month,
          feligreses: yearsMonthsCount[month]
        }));
        
        const chartData = Object.keys(yearsCount).map(year => ({
          name: year,
          feligreses: yearsCount[year]
        }));


        setAgeYarsData(charDataYearsAge);
        setAgeMonthsData(charDataMonthsAge);

        setMonthsData(charDataMonths);

        setYearsData(years); 
        setFullData(chartData); // Guardamos la data completa (sin filtrar)
        setData(chartData);

        // Inicializar selectedYears con todos los años seleccionados como true
        const uniqueYears = [...new Set(years)];
        setSelectedYears(uniqueYears.map(year => ({ año: year, value: true })));

        setLoading(false); 
      } catch (error) {
        console.log(error)
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filteredData = [];

    // Si hay un año seleccionado y también meses seleccionados
    if (selectedYears.filter(yearObj => yearObj.value).length === 1) {
        const selectedYear = selectedYears.find(yearObj => yearObj.value);

        if (selectedYear) {
            const selectedYearData = yearsData.filter(user => {
                const fechaCreacion = user.fechaCreacion;
                if (fechaCreacion && fechaCreacion.seconds) {
                    const userYear = new Date(fechaCreacion.seconds * 1000).getFullYear();
                    return userYear === selectedYear.año;
                }
                return false;
            });

            // Si no se han seleccionado meses, mostrar el conteo total de usuarios de ese año
            if (Object.keys(selectedMonths).length === 0 || !selectedMonths[selectedYear.año] || selectedMonths[selectedYear.año].length === 0) {
                // Filtrar los datos por el año seleccionado
                if(reportType === "general"){
                  filteredData = fullData.filter(item =>
                    selectedYears.some(yearObj => yearObj.año === parseInt(item.name) && yearObj.value)
                );  
                }else{
                  filteredData = ageYearsData.filter(item =>
                    selectedYears.some(yearObj => yearObj.año === parseInt(item.name) && yearObj.value)
                );  
                }
                
            } else {
              
              if(reportType === "general"){
                const resultado = monthsData.filter(item => item.name.toString().slice(0, 4) === selectedYear.año + "").map(
                  item => ({...item, // Mantiene las demás propiedades del objeto
                    name: item.name.toString().slice(4) // Elimina los primeros 4 caracteres
                    }));     

                    filteredData = Object.keys(monthNames)
                    .filter(monthIndex => selectedMonths[selectedYear.año] && selectedMonths[selectedYear.año].includes(parseInt(monthIndex) + 1))
                    .map(monthIndex => ({
                        name: monthNames[monthIndex],
                        feligreses: resultado.find(item => item.name === parseInt(monthIndex)+1+"").feligreses,
                    }));

              }else{
                console.log(ageMonthsData)
                const resultado = ageMonthsData.filter(item => item.name.toString().slice(0, 4) === selectedYear.año + "").map(
                  item => ({...item, // Mantiene las demás propiedades del objeto
                    name: item.name.toString().slice(4) // Elimina los primeros 4 caracteres
                    }));
                    
                    filteredData = Object.keys(monthNames)
                    .filter(monthIndex => selectedMonths[selectedYear.año] && selectedMonths[selectedYear.año].includes(parseInt(monthIndex) + 1))
                    .map(monthIndex => ({
                        name: monthNames[monthIndex],
                        niños: resultado.find(item => item.name === parseInt(monthIndex)+1+"").niños,
                        jovenes: resultado.find(item => item.name === parseInt(monthIndex)+1+"").jovenes,
                        adultos: resultado.find(item => item.name === parseInt(monthIndex)+1+"").adultos,
                    }));

              }
              
            }
        }
    } else {
        // Si no se selecciona un solo año, mostramos por años
        if(reportType === "general"){
          filteredData = fullData.filter(item =>
            selectedYears.some(yearObj => yearObj.año === parseInt(item.name) && yearObj.value)
        );
        }
        else{
          filteredData = ageYearsData.filter(item =>
            selectedYears.some(yearObj => yearObj.año === parseInt(item.name) && yearObj.value)
        );
        }
        
    }
    
    setData(filteredData); // Actualizamos los datos para la gráfica
}, [selectedYears, selectedMonths, fullData, yearsData, reportType]);


  // Función para manejar el cambio de los checkboxes de los años
  const handleYearCheckboxChange = (event) => {
    const { value, checked } = event.target;
    const yearValue = parseInt(value, 10); // Aseguramos que el valor sea un número

    if (value === 'todos') {
      setSelectAll(checked);
      setSelectedYears(uniqueYears.map(year => ({ año: year, value: checked })));
      if (checked) {
        setSelectedMonths(uniqueYears.reduce((acc, year) => {
          acc[year] = []; // Inicializamos los meses como vacíos para todos los años
          return acc;
        }, {}));
      }
    } else {
      setSelectedYears((prevSelectedYears) => {
        const yearIndex = prevSelectedYears.findIndex(yearObj => yearObj.año === yearValue);

        if (yearIndex > -1) {
          // Si el año existe, lo actualizamos
          return prevSelectedYears.map((yearObj, index) => {
            if (index === yearIndex) {
              return { ...yearObj, value: checked };
            }
            return yearObj;
          });
        } else {
          // Si el año no está en la lista, lo agregamos
          return [...prevSelectedYears, { año: yearValue, value: checked }];
        }
      });

      // Si el año fue desmarcado, también desmarcamos los meses correspondientes
      if (!event.target.checked) {
        setSelectedMonths((prevSelectedMonths) => {
          const updatedMonths = { ...prevSelectedMonths };
          delete updatedMonths[yearValue]; // Borramos los meses del año desmarcado
          return updatedMonths;
        });
      }
    }
  };

  // Función para manejar el cambio de los checkboxes de los meses
  const handleMonthCheckboxChange = (year, month, checked) => {
    setSelectedMonths((prevSelectedMonths) => {
      const updatedMonths = { ...prevSelectedMonths };
      if (!updatedMonths[year]) {
        updatedMonths[year] = [];
      }

      if (checked) {
        updatedMonths[year].push(month);
      } else {
        updatedMonths[year] = updatedMonths[year].filter(m => m !== month);
      }

      return updatedMonths;
    });
  };

  // Obtener años únicos a partir de yearsData para los checkboxes
  const uniqueYears = [...new Set(yearsData)].sort((a, b) => a - b);
  
  // Función que obtiene los meses disponibles para un año específico
  const getAvailableMonths = async (year) => {
    const months = new Set();
    const querySnapshot = await getDocs(collection(db, 'users'));
    querySnapshot.forEach((doc) => {
      const user = doc.data();
      if (user.fechaCreacion) {
        const userYear = user.fechaCreacion.toDate().getFullYear();
        const userMonth = user.fechaCreacion.toDate().getMonth() + 1; // Mes es 0-indexed
        if (userYear === year) {
          months.add(userMonth); // Agregamos el mes a la lista
        }
      }
    });
    return Array.from(months); // Convertimos el Set a un Array
  };

  // Llamar a getAvailableMonths cuando un año se seleccione
  useEffect(() => {
    // Solo hacer la consulta si se seleccionó un único año
    selectedYears.forEach(async (yearObj) => {
      if (yearObj.value && !availableMonths[yearObj.año]) {
        const months = await getAvailableMonths(yearObj.año);
        setAvailableMonths((prev) => ({
          ...prev,
          [yearObj.año]: months
        }));
      }
    });
  }, [selectedYears, availableMonths]);

  // Aquí utilizamos un useEffect para manejar el estado de "Todos"
  useEffect(() => {
    // Conteo de años seleccionados
    const conteoYearsSelected = selectedYears.filter(year => year.value).length;

    // Si todos los años están seleccionados, marcamos "Todos"
    if (conteoYearsSelected === selectedYears.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedYears]); // Este useEffect se ejecutará cada vez que cambie `selectedYears`

  // Función para manejar el cambio en el tipo de reporte
  const handleReportTypeChange = (event) => {
    setReportType(event.target.value);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <ChartWrapper>
      {/* Sección de análisis */}
      <AnalysisSection>
        {esconderTipos? <h3 onClick={hadleEsconderTipo}>Tipo de reporte ▾</h3> : <h3 onClick={hadleEsconderTipo}>Tipo de reporte ▴</h3>}
        {!esconderTipos && <RadioButtonGroup>
          <label>
            <input
              type="radio"
              value="general"
              checked={reportType === 'general'}
              onChange={handleReportTypeChange}
            />
            General
          </label>
          <label>
            <input
              type="radio"
              value="por franja de edad"
              checked={reportType === 'por franja de edad'}
              onChange={handleReportTypeChange}
            />
            Por franja de edad
          </label>
        </RadioButtonGroup>}
      </AnalysisSection>

      {/* Lista de checkboxes basada en los años disponibles */}
      <CheckboxList>
        {esconderPeriodos? <h3 onClick={hadleEsconderPeriodo}>Selecciona el periodo de tiempo ▾</h3>: <h3 onClick={hadleEsconderPeriodo} >Selecciona el periodo de tiempo ▴</h3>}

        {/* Opción para seleccionar "Todos" centrado */}
        {!esconderPeriodos && <CheckboxItemCentered>
          <input
            type="checkbox"
            id="todos"
            value="todos"
            checked={selectAll} // "Todos" está marcado si selectAll es true
            onChange={handleYearCheckboxChange}
          />
          <label htmlFor="todos">Todos</label>
        </CheckboxItemCentered>}

        {!esconderPeriodos && <YearsContainer>
          {uniqueYears.map(year => (
            <YearItem key={year}>
              <input
                type="checkbox"
                id={year}
                value={year}
                checked={selectedYears.some(yearObj => yearObj.año === year && yearObj.value)} // Verificamos si el año está seleccionado
                onChange={handleYearCheckboxChange}
              />
              <label htmlFor={year}>{year}</label>

              {/* Mostrar los meses solo si un solo año está seleccionado */}
              {selectedYears.filter(yearObj => yearObj.value).length === 1 && selectedYears.some(yearObj => yearObj.año === year && yearObj.value) && (
                <MonthCheckboxList>
                  {/* Renderizar los meses si están disponibles */}
                  {availableMonths[year] && availableMonths[year].map(month => (
                    <CheckboxItem key={month}>
                      <input
                        type="checkbox"
                        id={`month-${month}-${year}`}
                        value={month}
                        checked={selectedMonths[year] && selectedMonths[year].includes(month)}
                        onChange={(e) => handleMonthCheckboxChange(year, month, e.target.checked)}
                      />
                      <label htmlFor={`month-${month}-${year}`}>{monthNames[month - 1]}</label>
                    </CheckboxItem>
                  ))}
                </MonthCheckboxList>
              )}
            </YearItem>
          ))}
        </YearsContainer>}
      </CheckboxList>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {reportType === "general" ? (
      <Bar dataKey="feligreses" fill="#2EADA5" />
      ) : (
      <>
        {/* Tres barras por cada categoría */}
        <Bar dataKey="niños" fill="#65E65E" />
        <Bar dataKey="jovenes" fill="#FA9144" />
        <Bar dataKey="adultos" fill="#816DF7" />
      </>
      )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

const ChartWrapper = styled.div`
  width: 100%;
  padding: 20px;
  font-family: Arial, sans-serif;
`;

const AnalysisSection = styled.div`
  margin-bottom: 20px;
  h3 {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #2EADA5;
  }
`;

const RadioButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  label {
    font-size: 14px;
  }
`;

const CheckboxList = styled.div`
  margin-bottom: 20px;
  h3 {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #2EADA5;
  }
`;

const YearsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  flex-wrap: wrap;
`;

const YearItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px;
  input[type="checkbox"] {
    margin-bottom: 5px;
  }
`;

const MonthCheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
`;

const CheckboxItem = styled.div`
  margin: 5px 10px;
  display: flex;
  align-items: center;
  input[type="checkbox"] {
    margin-right: 10px;
  }
  label {
    font-size: 14px;
  }
`;

const CheckboxItemCentered = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 10px;
`;

export default BarChartComponent;
